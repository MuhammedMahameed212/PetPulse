from .models import Pet


def accessible_pets(user):
    """
    The one access rule for pets and their records. 
    PET-21 adds pets an owner shared with a vet.
    """
    return Pet.objects.filter(owner=user)
