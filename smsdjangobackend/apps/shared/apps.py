from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate
from django.utils.translation import gettext_lazy as _

from apps.shared.variables.formdefinition import FORMDEFINITIONS_FOR_MIGRATIONS


def custom_create_counters(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    try:
        AcademicYear = apps.get_model("institutes", "AcademicYear")
        FinancialYear = apps.get_model("institutes", "FinancialYear")
        Counter = apps.get_model("shared", "Counter")
        FormDefinition = apps.get_model("shared", "FormDefinition")
    except LookupError:
        return

    try:
        academic_year_queryset = AcademicYear.objects.using(using).filter(
            is_active=True
        )
        financial_year_queryset = FinancialYear.objects.using(using).filter(
            is_active=True
        )
        counter_list = Counter.objects.using(using).filter(is_active=True)
        form_definition_list = {
            form["form_name"] + "__" + form["column_name"]: form
            for form in FormDefinition.objects.using(using).all().values()
        }
        counters = list()
        form_defintions = list()
        form_defintions_update = list()
        from apps.shared.services import CounterService
        from apps.shared.services import FormdefinitionService

        for name, rows in FORMDEFINITIONS_FOR_MIGRATIONS.items():
            for value_new in rows:
                temp = value_new["form_name"] + "__" + value_new["column_name"]
                if temp not in form_definition_list:
                    form_defintions.append(FormDefinition(**value_new))
                elif (
                    form_definition_list[temp]["description"]
                    != value_new["description"]
                ):
                    form_defintions_update.append(
                        {
                            "description": value_new["description"],
                            "id": form_definition_list[temp]["id"],
                        }
                    )
        for name, value in CounterService.COUNTERS.items():
            if value["is_custom"]:
                continue
            if value["is_global_counter"] is True:
                if not counter_list.filter(type=value["type"]):
                    counters.append(
                        Counter(
                            academic_year=None,
                            type=value["type"],
                            alias_name=value["alias_name"],
                            value=1,
                            prefix=value["prefix"],
                            postfix=value["postfix"],
                        )
                    )
            elif value["standard"] is False and value["financial_year"] is False:
                for academic_year in academic_year_queryset:
                    if not counter_list.filter(
                        academic_year=academic_year, type=value["type"]
                    ):
                        counters.append(
                            Counter(
                                academic_year=academic_year,
                                type=value["type"],
                                alias_name=value["alias_name"],
                                value=1,
                                prefix=value["prefix"],
                                postfix=value["postfix"],
                            )
                        )
            elif value["financial_year"]:
                for financial_year in financial_year_queryset:
                    if not counter_list.filter(
                        financial_year=financial_year, type=value["type"]
                    ):
                        counters.append(
                            Counter(
                                financial_year=financial_year,
                                type=value["type"],
                                alias_name=value["alias_name"],
                                value=1,
                                prefix=value["prefix"],
                                postfix=value["postfix"],
                            )
                        )
        Counter.objects.using(using).bulk_create(counters)
        if form_defintions:
            FormDefinition.objects.using(using).bulk_create(form_defintions)
        if form_defintions_update:
            for form_def in form_defintions_update:
                form_obj = FormDefinition.objects.get(id=form_def["id"])
                form_obj.description = form_def["description"]
                form_obj.save()

        # temp code
        from apps.notification.models.notification import NotificationMedium
        # NotificationMedium.objects.filter(name='sms').update(is_active=False)

    except Exception:
        # Tables don't exist yet during migrations
        return


def custom_enable_default_notifications(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    try:
        NotificationApiConfiguration = apps.get_model(
            "notification", "NotificationApiConfiguration"
        )
    except LookupError:
        return

    try:
        # enabling sms
        notification_sms = NotificationApiConfiguration.objects.filter(
            api_name__in=["studentall_create"], notification_medium="sms"
        )
        for noti in notification_sms:
            noti.enable_for_school = True
            noti.save()

        # enabling push
        notification_push = NotificationApiConfiguration.objects.filter(
            api_name__in=[
                "studentall_create",
                "attendance_create",
                "diary_create",
                "feecollection_create",
            ],
            notification_medium="push",
        )
        for noti in notification_push:
            noti.enable_for_school = True
            noti.save()

        # disabling push
        notification_sms_dis = NotificationApiConfiguration.objects.filter(
            api_name__in=["diary_create"], notification_medium="sms"
        )
        for noti in notification_sms_dis:
            noti.enable_for_school = False
            noti.save()

    except Exception:
        # Table doesn't exist yet during migrations
        return


class SharedConfig(AppConfig):
    name = "apps.shared"
    verbose_name = _("Counters for academic year")

    def ready(self):
        post_migrate.connect(custom_create_counters, sender=self)
        post_migrate.connect(custom_enable_default_notifications, sender=self)
