from apps.shared.variables.attendance_reports import attendance_reports
from apps.shared.variables.finance_variables import (
    fee_collection_fee_receipts, fee_collection_student_copy,fee_collection_report,
    cashbook_reports, cashbook_report_fy_wise, balance_sheet_reports, recoverable_asset_reports
)
from apps.shared.variables.admission_variables import admission_fee_collection
from apps.shared.variables.fee_advance_receipt_variables import fee_advance_receipts
from apps.shared.variables.misc_reciept_varialbes import misc_receipts, misc_collection_reports
from apps.shared.variables.application_variables import application_fee_receipts
from apps.shared.variables.exam_variable import hall_ticket, marks_card,consolidated_report
from apps.shared.variables.study_certificate_variables import study_certificates, study_certificate_json_variables
from apps.shared.variables.fee_structure_variables import fee_structure, fee_structure_json_variables
from apps.shared.variables.character_certifiates_variables import character_certificate_json_variables,registration_form_json_variables,registration_form,character_certificate
from apps.shared.variables.conduct_certificates_variables import conduct_certificate,conduct_certificate_json_variables
from apps.shared.variables.bonified_certificates_variables import bonified_certificate,bonified_certificate_json_variables
from apps.shared.variables.transfer_certificate import transfer_certificate_json_variables
from apps.shared.variables.transfer_certificate import transfer_certificate
from apps.shared.variables.expense import expense_receipts,item_sold_receipts
from apps.shared.variables.payroll_variables import payslips
from apps.shared.variables.idcard_variables import idcards
from apps.shared.variables.idcard_variables import staff_id_cards
from apps.shared.variables.achievement_certificate_variables import achievement_certificate,achievement_certificate_json_variables
from apps.shared.variables.sport_certificate_variables import sport_certificate,sport_certificate_json_variables
from apps.shared.variables.graduation_certificate_variables import graduation_certificate,graduation_certificate_json_variables
from apps.shared.variables.teacher_appointment_letter_variables import teacher_appointment_letter,teacher_appointment_letter_json_variables
from apps.shared.variables.teacher_experience_letter_variables import teacher_experience_letter,teacher_experience_letter_json_variables
from apps.shared.variables.holiday_event_calendar import holiday_event_letter, holiday_event_json_variables
from apps.shared.variables.music_achievement_json_variables import music_achievement_letter, music_achievement_json_variables
from apps.shared.variables.poster_making_achievement_json_variables import poster_making_achievement_letter, poster_making_achievement_json_variables
from apps.shared.variables.gramina_certificates import gramina_certificate_json_variables,gramina_certificate
from apps.shared.variables.kannada_medium_variables import kannada_medium_certificate,kannada_medium_certificate_json_variables
from apps.shared.variables.degree_certificate_variables import degree_certificate,degree_certificate_json_variables
from apps.shared.variables.gatepass_variables import gate_pass_templates
from apps.shared.variables.visitor_pass_variables import visitor_pass_templates
from apps.shared.variables.application_form_variables import application_form
from apps.shared.variables.canteen_variables import canteen_order_receipts

default_template_list = {
    "fee_collection": fee_collection_fee_receipts,
    "fee_advance_receipt": fee_advance_receipts,
    "admission_form": admission_fee_collection,
    "fee_collection_student_copy": fee_collection_student_copy,
    "misc_reciept": misc_receipts,
    "misc_collection_report": misc_collection_reports,
    "fee_collection_report": fee_collection_report,
    "application_fees": application_fee_receipts,
    "hall_ticket": hall_ticket,
    "marks_card": marks_card,
    "consolidated_report" : consolidated_report,
    "study_certificate": study_certificates,
    "transfer_certificate": transfer_certificate,
    "conduct_certificate": conduct_certificate,
    "bonified_certificate": bonified_certificate,
    "expense": expense_receipts,
    "payslip": payslips,
    "cashbook_report": cashbook_reports,
    "cashbook_report_fy_wise": cashbook_report_fy_wise,
    "idcards": idcards,
    "staff_id_cards": staff_id_cards,
    "character_certificate": character_certificate,
    "achievement_certificate": achievement_certificate,
    "sport_certificate": sport_certificate,
    "graduation_certificate": graduation_certificate,
    "teacher_appointment_letter": teacher_appointment_letter,
    "teacher_experience_letter": teacher_experience_letter,
    "holiday_event": holiday_event_letter,
    "itemsold": item_sold_receipts,
    "music_achievement": music_achievement_letter,
    "poster_making_achievement": poster_making_achievement_letter,
    "fee_structure": fee_structure,
    "registration_form":registration_form,
    "attendance_reports": attendance_reports,
    "gramina_certificate":gramina_certificate,
    "kannada_medium_certificate":kannada_medium_certificate,
    "degree_certificate":degree_certificate,
    "gate_pass": gate_pass_templates,
    "visitor_pass": visitor_pass_templates,
    "application_form": application_form,
    "canteen_order": canteen_order_receipts,
}

# Define the mappings for the certificate names
certificate_mapping = {
    "study_certificate": study_certificates,
    "conduct_certificate": conduct_certificate,
    "bonified_certificate": bonified_certificate,
    "transfer_certificate": transfer_certificate,
    "achievement_certificate": achievement_certificate,
    "sport_certificate": sport_certificate,
    "graduation_certificate": graduation_certificate,
    "music_achievement": music_achievement_letter,
    "poster_making_achievement": poster_making_achievement_letter,
    "graduation_certificate": graduation_certificate,  
    "fee_structure": fee_structure,
    "gramina_certificate":gramina_certificate,
    "kannada_medium_certificate":kannada_medium_certificate,
    "character_certificate" :character_certificate,
    "degree_certificate":degree_certificate
}

# Define the default certificates list
default_certificates_list = [
    {
        "name": "studycertificate",
        "label": "Study Certificate"
    },
    {
        "name": "transfercertificate",
        "label": "Transfer Certificate"
    },
    {
        "name": "character_certificate",
        "label": "Character Certificate"
    },
    {
        "name": "achievementcertificate",
        "label": "Achievement Certificate"
    },
     {
        "name": "sportcertificate",
        "label": "Sport Certificate"
    },
     {
        "name": "conduct_certificate",
        "label": "Conduct Certificate"
    },
    {
        "name": "bonified_certificate",
        "label": "Bonified Certificate"
    },
    {
        "name": "graduationcertificate",
        "label": "Graduation Certificate"
    },
    {
        "name": "music_achievement",
        "label": "Music Achievement Certificate"
    },
    {
        "name": "poster_making_achievement",
        "label": "Poster Making Achievement Certificate"
    },
    {
        "name": "fee_structure",
        "label": "Fee Structure"
    },
    {
        "name": "registration_form",
        "label": "Registration Form"
    },
    {
        "name": "gramina_certificate",
        "label": "Gramina Certificate"
    },
    {
        "name": "kannada_medium_certificate",
        "label": "Kannada Medium Certificate"
    },
    {
        "name": "degree_certificate",
        "label": "Degree Certificate"
    }
]
defult_staff_certificate_list = [
    {
        "name": "teacherappiontmentletter",
        "label": "Teacher Appointment Letter"
    },
    {
        "name": "teacherexperienceletter",
        "label": "Teacher Experience Letter"
    },
]
for certificate in defult_staff_certificate_list:
    name = certificate["name"]
    label = certificate["label"]

    # Retrieve the corresponding variable from the mapping
    certificate_data = certificate_mapping.get(name)


# Example: Dynamically access variables from the list
for certificate in default_certificates_list:
    name = certificate["name"]
    label = certificate["label"]

    # Retrieve the corresponding variable from the mapping
    certificate_data = certificate_mapping.get(name)
    
    # Use the certificate data as needed
    # print(f"Processing {label}: {certificate_data}")


# default_certificates_list = [
#     {
#         "name": "study_certificate",
#         "label": "Study Certificate"
#     },
#     {
#         "name": "transfer_certificate",
#         "label": "Transfer Certificate"
#     },
#     {
#         "name": "character_certificate",
#         "label": "Character Certificate"
#     }
# ]


json_dynamic_values_for_template = {
    "study_certificate": study_certificate_json_variables,
    "character_certificate": character_certificate_json_variables,
    "conduct_certificate": conduct_certificate_json_variables,
    "bonified_certificate": bonified_certificate_json_variables,
    "transfer_certificate": transfer_certificate_json_variables,
    "achievement_certificate": achievement_certificate_json_variables,
    "sport_certificate": sport_certificate_json_variables,
    "graduation_certificate": graduation_certificate_json_variables,
    "teacher_appointment_letter":teacher_appointment_letter_json_variables,
    "teacher_experience_letter":teacher_experience_letter_json_variables,
    "holiday_event": holiday_event_json_variables,
    "music_achievement": music_achievement_json_variables,
    "poster_making_achievement": poster_making_achievement_json_variables,
    "fee_structure": fee_structure_json_variables,
    "registration_form":registration_form_json_variables,
    "gramina_certificate":gramina_certificate_json_variables,
    "kannada_medium_certificate":kannada_medium_certificate_json_variables,
    "degree_certificate":degree_certificate_json_variables
}
# json_dynamic_values_for_staff_template = {
#     "teacher_appointment_letter":teacher_appointment_letter_json_variables,   
# }
feecollection_report_filterdata = {
    "extra_columns": [
        {
            "label_name": "Last transaction Details",
            "description": "Recently collected fees according to fee type",
            "name": "last_transaction_details",
        },
        {
            "label_name": "Selected fee types total amount",
            "description": "Displays Total amount of only selected fee types",
            "name": "selected_feetypes_totalamount",
        },
        {
            "label_name": "Only selected fee type paid students list",
            "description": "Only selected fee type paid students list",
            "name": "only_selected_fee_type_term_paid",
        },
        {
            "label_name": "Transport area wise pending report",
            "description": "Shows area and pending students count grouped by area",
            "name": "transport_area_wise_pending_report",
        },
    ]
}
multiple_certificate = {
    "study_certificate_list": [
        {"lable_name": "Certificate Type 1", "value": 1},
        {"lable_name": "Certificate Type 2", "value": 2},
    ],
     "other_certificate_list": [
        {"lable_name": "Certificate Type 1", "value": 1},
        {"lable_name": "Certificate Type 2", "value": 2},
    ]
}
