from django.dispatch import receiver
from axes.signals import user_locked_out
import logging

logger = logging.getLogger(__name__)

@receiver(user_locked_out)
def axes_lockout_handler(sender, request, username, ip_address, **kwargs):
    """
    Log une tentative de brute force quand un utilisateur/IP est verrouillé par Axes.
    """
    logger.warning(
        "Brute force lockout — IP: %s, compte: %s",
        ip_address,
        username,
    )
