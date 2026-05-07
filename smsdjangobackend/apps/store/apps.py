from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate


def copy_mode_of_payment(
    sender, using=DEFAULT_DB_ALIAS, **kwargs
):  # delete this once code is executed
    try:
        ItemSold = apps.get_model("store", "ItemSold")
        ItemSoldModeOfPayment = apps.get_model("store", "ItemSoldModeOfPayment")
        fee_collection_mode_of_payment = {
            fee["item_sold"]: fee
            for fee in ItemSoldModeOfPayment.objects.all().values("item_sold")
        }
        mode_of_payment = []
        for fee_row in ItemSold.objects.all():
            if fee_row.id in fee_collection_mode_of_payment:
                continue
            mode_of_payment.append(
                ItemSoldModeOfPayment(
                    mode_of_payment=fee_row.mode_of_payment,
                    payment_ref_num=fee_row.payment_reference_num,
                    item_sold=fee_row,
                    amount=fee_row.total_amount_inc_gst,
                )
            )
        if mode_of_payment:
            ItemSoldModeOfPayment.objects.bulk_create(mode_of_payment)
    except Exception:
        # Table doesn't exist yet during migrations
        return


class StoreConfig(AppConfig):
    name = "apps.store"

    def ready(self):
        post_migrate.connect(copy_mode_of_payment, sender=self)
