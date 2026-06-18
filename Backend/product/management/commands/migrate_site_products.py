"""
Commande de migration : importe les produits depuis l'API Express (site vitrine)
vers la base Django.

Usage :
    python manage.py migrate_site_products
    python manage.py migrate_site_products --dry-run          # aperçu sans écriture
    python manage.py migrate_site_products --force-update     # réimporter même si déjà présent
    python manage.py migrate_site_products --url https://...  # URL personnalisée de l'API Express

Ce que fait la commande :
  1. Appelle GET /api/products sur le site vitrine Express pour récupérer les 94 produits
  2. Pour chaque produit Express :
     - Trouve ou crée la catégorie Django correspondante (tops→Hauts, pants→Pantalons, etc.)
     - Crée le produit Django avec tous les champs mappés
     - Crée les entrées ProductImage depuis le tableau d'images
     - Crée une Variant par taille (même prix pour toutes)
  3. Affiche un résumé (créés / ignorés / erreurs)
"""

import json
import urllib.request
import urllib.error

from django.core.management.base import BaseCommand
from django.db import transaction

from product.models import Category, Product, ProductImage, Variant


# ── Mapping des slugs Express → noms de catégories Django (français) ──────────
CATEGORY_MAPPING = {
    'tops':      'Hauts',
    'pants':     'Pantalons',
    'sets':      'Ensembles',
    # Noms français directs (au cas où les données auraient été saisies ainsi)
    'hauts':     'Hauts',
    'pantalons': 'Pantalons',
    'ensembles': 'Ensembles',
}

# Slugs de marques stockés dans le tableau category Express (à ignorer pour la catégorie)
SLUGS_MARQUES = {'nike', 'adidas', 'ua', 'under armour', 'underarmour', 'under_armour'}

# URL publique de l'API Express par défaut
URL_API_EXPRESS_PAR_DEFAUT = 'https://siteweb-softcosy.vercel.app/api/products'

# Valeurs de badge acceptées par le modèle Django
BADGE_VALIDES = {'NEW', 'BESTSELLER', 'HOT', 'SET', 'CLASSIC', ''}


class Command(BaseCommand):
    help = "Migre les produits depuis l'API Express (site vitrine) vers Django"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les produits sans les créer en base (aperçu)',
        )
        parser.add_argument(
            '--force-update',
            action='store_true',
            help='Réimporter les produits déjà présents (basé sur code_produit)',
        )
        parser.add_argument(
            '--url',
            default=URL_API_EXPRESS_PAR_DEFAUT,
            help=f'URL de l\'API Express (défaut : {URL_API_EXPRESS_PAR_DEFAUT})',
        )

    def handle(self, *args, **options):
        dry_run      = options['dry_run']
        force_update = options['force_update']
        api_url      = options['url']

        self.stdout.write(self.style.MIGRATE_HEADING(
            '\n=== Migration des produits Express -> Django ==='
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING('  Mode DRY-RUN -- aucune ecriture en base\n'))

        # ── 1. Récupérer les produits depuis l'API Express ────────────────────
        self.stdout.write(f'Récupération depuis : {api_url}')
        try:
            req = urllib.request.Request(
                api_url,
                headers={'Accept': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                produits_express = json.loads(resp.read().decode('utf-8'))
        except urllib.error.URLError as exc:
            self.stderr.write(self.style.ERROR(f'Erreur réseau : {exc}'))
            return
        except json.JSONDecodeError as exc:
            self.stderr.write(self.style.ERROR(f'Réponse non-JSON : {exc}'))
            return

        if not isinstance(produits_express, list):
            self.stderr.write(self.style.ERROR('L\'API n\'a pas retourné une liste de produits.'))
            return

        self.stdout.write(f'-> {len(produits_express)} produit(s) recupere(s)\n')

        # ── 2. Importer chaque produit ────────────────────────────────────────
        nb_crees   = 0
        nb_ignores = 0
        nb_erreurs = 0

        for item in produits_express:
            try:
                with transaction.atomic():
                    resultat = self._migrer_produit(item, dry_run, force_update)
                if resultat == 'cree':
                    nb_crees += 1
                elif resultat == 'ignore':
                    nb_ignores += 1
            except Exception as exc:
                nb_erreurs += 1
                nom = item.get('name', '?')
                self.stderr.write(self.style.ERROR(f'  !! Erreur "{nom}" : {exc}'))

        # ── 3. Résumé ─────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'OK {nb_crees} produit(s) importe(s)'))
        if nb_ignores:
            self.stdout.write(self.style.WARNING(f'-- {nb_ignores} produit(s) ignore(s) (deja presents)'))
        if nb_erreurs:
            self.stdout.write(self.style.ERROR(f'!! {nb_erreurs} erreur(s)'))

    # ── Méthodes utilitaires ──────────────────────────────────────────────────

    def _parse_json(self, valeur, defaut=None):
        """
        Convertit un champ Express en objet Python.
        Gère : tableau Python (JSONB déjà parsé), chaîne JSON, None.
        """
        if defaut is None:
            defaut = []
        if valeur is None:
            return defaut
        if isinstance(valeur, (list, dict)):
            return valeur
        try:
            return json.loads(valeur)
        except (json.JSONDecodeError, TypeError):
            return defaut

    def _extraire_categorie(self, category_raw):
        """
        Extrait le nom de catégorie Django depuis le tableau Express.

        Express stockait les catégories ET les marques dans le même tableau :
        ex. ['tops', 'nike'] — 'tops' est la catégorie, 'nike' est la marque.
        On ignore les slugs de marques et on retourne le nom français de la catégorie.
        """
        categories = self._parse_json(category_raw)
        for item in categories:
            slug = str(item).lower().strip()
            if slug not in SLUGS_MARQUES:
                nom_fr = CATEGORY_MAPPING.get(slug)
                if nom_fr:
                    return nom_fr
                # Slug inconnu : le capitaliser et l'utiliser tel quel
                return item.strip().capitalize()
        return None

    def _migrer_produit(self, item, dry_run, force_update):
        """
        Migre un produit Express vers Django.
        Retourne 'cree' ou 'ignore'.
        """
        nom         = (item.get('name') or '').strip()
        sku         = (item.get('sku')  or '').strip()
        marque      = (item.get('brand') or '').strip()
        prix        = float(item.get('price') or 0)
        tissu       = (item.get('fabric') or '').strip()
        description = (item.get('description') or '').strip()
        icon        = (item.get('icon') or '👕').strip() or '👕'
        badge_raw   = (item.get('badge') or '').strip().upper()

        tailles = self._parse_json(item.get('sizes'))
        couleurs = self._parse_json(item.get('colors'))
        images  = self._parse_json(item.get('images'))

        # Nettoyer les tailles : exclure les valeurs vides
        tailles = [str(t).strip() for t in tailles if t and str(t).strip()]

        # Normaliser le badge selon les choix valides du modèle
        badge = badge_raw if badge_raw in BADGE_VALIDES else ''

        # Extraire la catégorie (nom français)
        nom_categorie = self._extraire_categorie(item.get('category'))

        # ── Vérifier si le produit existe déjà ───────────────────────────────
        if not force_update and sku and Product.objects.filter(code_produit=sku).exists():
            self.stdout.write(f'  -- Ignore   : {nom} ({sku})')
            return 'ignore'

        # ── Mode aperçu ───────────────────────────────────────────────────────
        if dry_run:
            self.stdout.write(
                f'  [DRY] {nom:<35} | cat: {nom_categorie or "?":<12} | '
                f'{len(images)} img | {len(tailles) or 1} variante(s) | prix: {prix}'
            )
            return 'cree'

        # ── Trouver ou créer la catégorie Django ──────────────────────────────
        categorie_obj = None
        if nom_categorie:
            # get_or_create insensible à la casse : cherche d'abord, crée si absent
            qs = Category.objects.filter(name__iexact=nom_categorie)
            if qs.exists():
                categorie_obj = qs.first()
            else:
                categorie_obj = Category.objects.create(name=nom_categorie)

        # ── Créer le produit Django ───────────────────────────────────────────
        product = Product.objects.create(
            name=nom,
            code_produit=sku or None,
            description=description,
            brand=marque,
            badge=badge,
            icon=icon,
            fabric=tissu,
            colors=couleurs,
            is_published=True,
            category=categorie_obj,
        )

        # ── Créer les images de la galerie ────────────────────────────────────
        for ordre, url in enumerate(images):
            url = str(url).strip() if url else ''
            if url:
                ProductImage.objects.create(
                    product=product,
                    image_url=url,
                    cloudinary_public_id='',  # URL Cloudinary existante, pas de public_id connu
                    order=ordre,
                )

        # ── Créer les variantes (une par taille) ──────────────────────────────
        # Express n'avait qu'un seul prix pour toutes les tailles
        if tailles:
            for taille in tailles:
                Variant.objects.create(
                    product=product,
                    size=taille,
                    selling_price=prix,
                    is_active=True,
                )
        else:
            # Produit sans tailles → variante unique
            Variant.objects.create(
                product=product,
                size='Unique',
                selling_price=prix,
                is_active=True,
            )

        nb_variantes = len(tailles) if tailles else 1
        self.stdout.write(
            f'  OK Cree    : {nom:<35} | {nom_categorie or "?":<12} | '
            f'{len(images)} img | {nb_variantes} variante(s)'
        )
        return 'cree'
