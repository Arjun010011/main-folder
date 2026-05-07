from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate


def custom_create_fee(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    """
    Create content types for models in the given app.
    """

    FeeType = apps.get_model('finance', 'FeeType')
    if not FeeType.objects.filter(codename='application'):
        FeeType.objects.create(name='Application fee', codename='application', is_feature=True)

def copy_mode_of_payment(sender, using=DEFAULT_DB_ALIAS, **kwargs): #delete this once code is executed
    FeeCollection = apps.get_model('finance', 'FeeCollection')
    FeeCollectionModeOfPayment = apps.get_model('finance', 'FeeCollectionModeOfPayment')
    fee_collection_mode_of_payment = {fee['fee_collection'] : fee for fee in FeeCollectionModeOfPayment.objects.all().values('fee_collection')}
    mode_of_payment = []
    for fee_row in FeeCollection.objects.all():
        if fee_row.id in fee_collection_mode_of_payment:
            continue
        mode_of_payment.append(FeeCollectionModeOfPayment(
            mode_of_payment=fee_row.mode_of_payment,
            payment_ref_num=fee_row.payment_ref_num,
            fee_collection=fee_row,
            amount=fee_row.total_amount
        ))
    if mode_of_payment:
        FeeCollectionModeOfPayment.objects.bulk_create(mode_of_payment)


class FinanceConfig(AppConfig):
    name = 'apps.finance'

    def ready(self):
        post_migrate.connect(custom_create_fee, sender=self)
        post_migrate.connect(copy_mode_of_payment, sender=self)
        # Import signals to register them
        import apps.finance.signals  # noqa
