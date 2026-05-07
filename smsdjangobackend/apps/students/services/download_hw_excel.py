from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.models.custom import CustomForm
from apps.institutes.models import Institute

def download_diary_student_data(self, data):
    institute=Institute.get_institute(self)
    options={}
    options['title'] = 'INDIAN ABACUS DAILY REPORT 2025'
    options['description'] = 'Daily Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'DATE', 'required': False, 'schemacolumn': 'home_work_due_date'
        },
        {
            'column': 'BATCH', 'required': False, 'schemacolumn': 'home_work_standard_name'
        },{
            'column': 'STUDENT NAME', 'required': False, 'schemacolumn': 'home_work_student_name'
        }
        ,{
            'column': 'LEVEL', 'required': False, 'schemacolumn': 'home_work_section_name'
        },{
            'column': 'CLASSROOM ACTIVITIES', 'required': False, 'schemacolumn': 'assigned_subject'
        },{
            'column': 'HOME WORK', 'required': False, 'schemacolumn': 'home_work_title'
        },{
            'column': 'REMARK', 'required': False, 'schemacolumn': 'home_work_student_marks'
        },
    ]
    return write_to_excel_new(self, options, {}, {})