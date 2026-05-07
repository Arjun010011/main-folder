from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate
from django.utils.translation import gettext_lazy as _
from django.db import DEFAULT_DB_ALIAS


def custom_create_lop(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    """
    Create content types for models in the given app.
    """

    try:
        FinancialYear = apps.get_model('institutes', 'FinancialYear')
        LeaveType = apps.get_model('hr', 'LeaveType')
        LeaveTypeMapping = apps.get_model('hr', 'LeaveTypeMapping')
    except LookupError:
        return
    financial_queryset = FinancialYear.objects.using(using).filter(is_active=True)
    try:
        leaveTypeObj = LeaveType.objects.using(using).get(code='lop')#only return for lop we will remove this code once all company gets this leave type
        leave_type_mapping_queryset = LeaveTypeMapping.objects.using(using).filter()
        leaveTypeList = list()
        for data in leave_type_mapping_queryset.values():
            key = str(data['financial_year_id']) + '_x_' + str(data['leave_type_id'])
            if( key not in leaveTypeList ):
                leaveTypeList.append(key)
        dataToSave = list()
        for financialYear in financial_queryset.values():
            checkKey = str(financialYear['id'])+'_x_'+str(leaveTypeObj.id)
            if( checkKey not in leaveTypeList ):
                dataToSave.append(LeaveTypeMapping(financial_year_id=financialYear['id'],max_leave_num=0, leave_type_id=leaveTypeObj.id))
        LeaveTypeMapping.objects.using(using).bulk_create(dataToSave)
    except:
        return

class InstitutesConfig(AppConfig):
    name = 'apps.institutes'
    verbose_name = _("Lop in Leave type")

    def ready(self):
        post_migrate.connect(custom_create_lop, sender=self)
