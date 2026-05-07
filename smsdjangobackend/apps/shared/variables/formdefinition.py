FORMDEFINITIONS_FOR_MIGRATIONS = {
        'inventory_configurations' : [
            {
                'form_name': 'inventory_configurations', 'column_name': 'is_unit_price_editable_on_issue',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': 'In store can we edit the price in the issue page'
            }
        ],
        'fee_configurations': [
            {
                'form_name': 'fee_configurations', 'column_name': 'valid_days_to_delete_fees',
                'column_alias': 'used_as_local_page_setting', 'default_value': '7', #-> number of days user can delete the transaction
                'description': 'If you want to delete the transaction of the fees within how many days we can delete'
            },{
                'form_name': 'fee_configurations', 'column_name': 'hide_fee_term_sequence',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': 'Fee term sequence used to pay the fees one after the other. Whether we have to enable or disable is the setting'
            },{
                'form_name': 'fee_configurations', 'column_name': 'fee_type_view_web',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': '1: Fee Type View, 2: Fee Term View in Fee collection 3: Fee group view specially for jnana jyothi'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'fee_type_view',
                'column_alias': 'used_as_local_page_setting', 'default_value': 'fee_type_wise',
                'description': 'fee_type_wise: Fee type wise in student payment screen'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_payment_editable_for_student',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Is payment editable for student in fee payment screen mobile app'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_fee_group_enabled',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: Grouping of multiple fee type in groups'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_payment_mode_auto_select',
                'column_alias': 'used_as_local_page_setting', 'default_value': 'Cash',
                'description': 'In fee collection page which payment should be selected by default (Cash, Cheque,CreditCard,DebitCard,NetBanking,UPIPayments,Online)'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'unique_receipt_number',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': '1: Fee receipt Should be unique'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'enable_additional_charge',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: Enables addtional fees'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'cashbook_download_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': '0: Open Popup to ask for download type, 1: Download Excel Only, 2:Download Pdf Only'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'enable_manual_receipt_num',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'enable_manual_receipt_num 1: Show user to enter the receipt number in fee collection page'
            },{
                'form_name': 'fee_configurations', 'column_name': 'is_application_amount_editable',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'is_application_amount_editable 1: Use can edit the application amount'
            },{
                'form_name': 'fee_configurations', 'column_name': 'split_based_on_mode_of_payment',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If Set to 1 cashbook will download based on mode_of_payment. If transaction made using two transaction then two rows will be visible'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_mode_of_pay_multiple',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If set to 1 multiple mode of payment in fee collection will be enabled'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_cash_denomination_enabled',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If set to 1 denomination list will be showed for cash'
            },
             {
                'form_name': 'fee_configurations', 'column_name': 'default_collapse_open_for_fee_details',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If set to 1 open the collapse by default in fee details page in app'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'is_rte_fee_enabled',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0:enabled,1:disabled'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'fee_plan_types',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1:student_group,2:gender,3:is_new_student supported 1 / 1,2 / 1,2,3 / 1,3 / 2,3'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'show_student_previous_year_fee_in_feecollection',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Shows previous year fees in fee collection page web'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'show_sibling_fee_details_in_feecollection',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Show sibling fee details in fee collection page web'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'adjustment_approval_enabled',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: Concession approvals follow the staff hierarchy, and anyone with the necessary permission can approve them.'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'hide_miscellaneous',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: Hide Miscellaneous From Cashbook'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'cashbook_feecollection_wise',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Only one Row is created for one fee collection'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'hide_fee_types_from_app',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'This will just hide the perticular fee type to display from app'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'show_bank_name_in_payment_details',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0: Hide bank name in payment details, 1: Show bank name in payment details'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'mandatory_bank_name_in_payment_details',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0: make bank name non-mandatory in payment details, 1: make bank name in mandatory payment details'
            },
            {
                'form_name': 'fee_configurations', 'column_name': 'only_show_pending_fees',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0.Shows Both Total Amount and Pending Amount , 1: Shows Only Pending Amount in Student Mobile App'
            },
        ],
        'transport_configurations':[
            {
                'form_name': 'transport_configurations', 'column_name': 'allow_automatic_location_update',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': 'App - Should the location update automatically from app or user should update the location'
            },
            {
                'form_name': 'transport_configurations', 'column_name': 'location_update_max_distance',
                'column_alias': 'used_as_local_page_setting', 'default_value': 100,
                'description': 'When van is nearing to pickup/drop location we have to update as reached. So when reaches near to location in 100meters we update'
            },
            {
                'form_name': 'transport_configurations', 'column_name': 'app_map_view',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0: To View all the information 1: To view map only. In Mobile App Bus Tracking View'
            },
            {
                'form_name': 'transport_configurations', 'column_name': 'gps_tracking_selection',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0: Gps Tracking Using Driver Device 1: Gps Tracking Using GPS Device. 2: Gps Tracking Using 3rd Party App'
            }
        ],
        'custom_report_configurations':[
            {
                'form_name': 'custom_report_configurations', 'column_name': 'get_pending_based_on_today',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': '1 = show pending upto today ,0 = show totalpending'
            }
        ],
        'chat_configuration':[
            {
                'form_name': 'chat_configuration',
                'column_name':'group_id',
                'column_alias':'Group Id',
                'default_value':'',
                'description':'Specify the Group id That has to be pinned , For ex- 1,2,3',
                'hidden': 0,
                "editable": 1,
                "required": 0
            },
            {
                'form_name': 'chat_configuration',
                'column_name':'class_teacher_pin_status',
                'column_alias':'Pin Status',
                'default_value':'',
                'description':'Class Teacher whether to be pinned or not. 1: pin 0: not pin',
                'hidden': 0,
                "editable": 1,
                "required": 0
            }
        ],
        'exam_configurations': [
            {
                'form_name': 'exam_configurations', 'column_name': 'grade_plan',
                'column_alias': 'used_as_local_page_setting', 'default_value': '1',
                'description': 'Is grade plan concept there in Institute'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'ignore_approve_exam_validation',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'While approving it ignores the validation like date time minmarks maxmarks all'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'cumulative_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': '1',
                'description': 'Is cumulative type concept used in Institute'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'merge_subject_for_hallticket',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Subject will be merged while showing in hallticket.'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'app_show_time_in_schedule',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': 'When 0 we hide time for student'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'app_show_marks_in_schedule',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': 'When 0 we hide marks for student'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'show_manual_attendance_in_schedule',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'When 1 will show the manual attendance in exam schedule and marks entry screen'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'show_remarks_in_marks_entry',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'When set to 1 will show the remarks dropdown in the exam schedule'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'is_marks_round_off',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'When set to 1 Configured exam marks will be round off'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'is_marks_card_longrunning',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Long Running for Marks Card'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'sunday_holiday_alias name',
                'column_alias': 'used_as_local_page_setting', 'default_value': "",
                'description': 'This is the alias name for sunday holiday and used in Hall Ticket'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'study_holiday_alias name',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'This is the alias name for middle holidays and used in Hall Ticket'
            },
            {
                'form_name': 'exam_configurations', 'column_name': 'validate_fee_paid_for_student_hallticket',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'When 1, student must have all fees paid (as per payment end date) to print hall ticket; when 0, no fee check for hall ticket'
            }
        ],
        'counter_confgiruation': [
            {
                'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_fee_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Is counter fee type wise'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_fee_type_group',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Here we can group the fee_type'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'application_reciept_new_student_old_student',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Is old student and new student create the receipt number'
            },
            {#when standardwise is enable fee type group wise should be disalbed
                'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_standard_wise',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If yes - Receipt counter will be generated for each standard. Trigger the event to create the standard wise when setting enabled'
            },#built for jnana jyothi [school] -> counter format , [highschool] -> counter format, [college] -> counter format
            {
                'form_name': 'counter_confgiruation', 'column_name': 'admission_fee_standard_wise',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If yes - Admission counter will be generated for each standard. Trigger the event to create the standard wise when setting enabled'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'misc_counter_point_to_finance',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If yes counter misc counter add to fee_receipt counter'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'misc_separate_counter_for_misc_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If yes separate counter will be created for tc and study certificate'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'counter_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': None,
                'description': '1: STANDARD_SECTION_WISE : standard section wise counter, FEE_RECEIPT_FEE_TYPE : fee type wise counter, FEE_RECEIPT_FEE_TYPE_GROUP : group wise'
            },
            {
                'form_name': 'counter_confgiruation', 'column_name': 'counter_value_format',
                'column_alias': 'used_as_local_page_setting', 'default_value': '3',
                'description': 'Number of digits to be displayed in the counter value (3 digits default (Ex: 001))'
            },
        ],
        'student_configuration': [
            {
                'form_name': 'student_configuration', 'column_name': 'auto_login_create',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If yes - login will be created automatically where admission number will the username'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'default_password',
                'column_alias': 'used_as_local_page_setting', 'default_value': 'edubricz',
                'description': 'default password is created when the user login is created'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'readmission',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'when readmission is enabled student can readmit to the new standard again'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'address_google_map',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: we use map to select address, 0: e use drop down to select address'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'is_profile_pic_can_capture',
                'column_alias': 'used_as_local_page_setting', 'default_value': '0',
                'description': '0: only we can upload picture from computer , 1: both uploading and capturing the image'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'is_barcode_generate',
                'column_alias': 'used_as_local_page_setting', 'default_value': '0',
                'description': '0: Barcode image will not be generated for ID card , 1: Barcode image will be generated for ID card'
            },
            {
                'form_name': 'student_configuration', 'column_name': 'ignore_fee_pending_while_giving_tc',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: ignores fee pending amount while giving issuing tc student '
            }
        ],
        'expense_configuration':[
            {
                'form_name': 'expense_configuration', 'column_name': 'expense_pdf_upload',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0: Uploading expense pdf is not mandatory.1: Uploading expense pdf is mandatory.'
            },
            {
                'form_name': 'expense_configuration', 'column_name': 'valid_days_to_edit_delete_expense',
                'column_alias': 'used_as_local_page_setting', 'default_value': '7',
                'description': 'Number of days within which an expense can be edited or deleted after creation. Set to 0 to disable the restriction.'
            }
        ],
        'certificate_configuration':[
            {
                'form_name': 'certificate_configuration', 'column_name': 'is_multiple_study_certificate',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0:only one certificate more than 1 you wil get the dropdown based on the count you have entered.'
            },
            {
                'form_name': 'certificate_configuration', 'column_name': 'is_fee_clearance_mandatory_for_study_certificate',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0:Fee clearance is not mandatory for study certificate 1:Fee clearance is mandatory for study certificate'
            },
        ],
        'staff_configuration':[
            {
                'form_name': 'staff_configuration', 'column_name': 'is_staff_group_type',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '0:No filter for group_type 1:Filter based on group type'
            },
            {
                'form_name': 'staff_configuration', 'column_name': 'address_google_map',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': '1: we use map to select address, 0: e use drop down to select address'
            },
            {
                'form_name': 'staff_configuration', 'column_name': 'is_deleted_staff',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'Show present button to mark the attendance in staff attendance '
            }

        ],
        'staff_attendance_configuration':[
            {
                'form_name': 'staff_attendance_configuration', 'column_name': 'is_am_pm_required_in_staff_report',
                'column_alias': 'used_as_local_page_setting', 'default_value': 1,
                'description': '0:No AM and PM Mentioned 1:AM and PM Mentioned'
            }
        ],
        'payrol_confgiruation': [
            {
                'form_name': 'payrol_confgiruation', 'column_name': 'attendance_days_per_month',
                'column_alias': 'used_as_instant_payout_setting', 'default_value': 0,
                'description': '0: Number of days per month will be auto, example if set to 30 number of days per month for calculating salary is 30. \
                present_days/30*salary. Min value should be 28 max should be 31. If other value given it takes automatic days'
            }
        ],
        'tutorial_configuration':[
            {
                'form_name': 'tutorial_configuration', 'column_name': 'gallery_view',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If 0 shows like document view. If set to 1 shows like image viewer'
            },
            {
                'form_name': 'tutorial_configuration', 'column_name': 'allow_duplicate_files',
                'column_alias': 'used_as_local_page_setting', 'default_value': 0,
                'description': 'If 1 allow duplicate file with appending timestamping to it'
            }
        ],
        'payment_confgiruation': [
            {
                'form_name': 'payment_confgiruation', 'column_name': 'instant_payout',
                'column_alias': 'used_as_instant_payout_setting', 'default_value': 0,
                'description': '0: Payout runs on cron, 1: instant payout after payment'
            },
            {
                'form_name': 'payment_confgiruation', 'column_name': 'is_split_payment',
                'column_alias': 'used_as_instant_payout_setting', 'default_value': 0,
                'description': '0: Split Payment is not enabled, 1: split payment is enabled'
            },
            {
                'form_name': 'payment_confgiruation', 'column_name': 'is_disable_payment_method_page_in_student_app',
                'column_alias': 'is_disable_payment_method_page_in_student_app', 'default_value': 0,
                'description': '0: Payment Method page id enabled in student App, 1: Payment Method page is Disabled is student app'
            },
            {
                'form_name': 'payment_confgiruation', 'column_name': 'max_time_to_expire_order_id',
                'column_alias': 'max_time_to_expire_order_id', 'default_value': 5,
                'description': 'After 5 mins order id will expire'
            },
            {
                'form_name': 'payment_confgiruation', 'column_name': 'show_transaction_fee_in_mobile_app',
                'column_alias': 'show_transaction_fee_in_mobile_app', 'default_value': 1,
                'description': 'Transaction fee will not be visible in Student App'
            },
            {
                'form_name': 'payment_confgiruation', 'column_name': 'show_edubricz_mode_of_payment_page',
                'column_alias': 'show_edubricz_mode_of_payment_page', 'default_value': 0,
                'description': 'Show Edubricz mode of payment page to select mode of payment in Mobile App before redirecting to payment gateway'
            },
        ],
        'student_attendance_configuration': [
            {
                'form_name': 'student_attendance_configuration', 'column_name': 'number_of_session',
                'column_alias': 'used_as_instant_payout_setting', 'default_value': 2,
                'description': 'we consider how many times the attendance will be marked by the staff available values are 1 or 2'
            },
            {
                'form_name': 'student_attendance_configuration', 'column_name': 'block_attendance_on_holiday_or_nonworking',
                'column_alias': 'used_as_instant_payout_setting', 'default_value': 0,
                'description': 'If 1 block the attendance on non-working day / Holiday'
            },
            {
                'form_name':'student_attendance_configuration',
                'column_name':'year_selection',
                'column_alias':'Year',
                'description':'0: not to select default year, 1: Selects current academic year, 2: Latest academic year',
                'hidden': False,
                'editable': True,
                'required': False,
                'default_value':'1',
            },
            {
                'form_name':'student_attendance_configuration',
                'column_name':'is_subject_wise',
                'column_alias':'Subject Wise Attendance',
                'description':'0:normal atttendance, 1:subject wise attendance',
                'hidden': False,
                'editable': True,
                'required': False,
                'default_value':'0',
            },
            {
                'form_name':'student_attendance_configuration',
                'column_name':'is_subject_period_wise',
                'column_alias':'Subject Wise Attendance is period wise',
                'description':'0:normal atttendance, 1:subject wise attendance',
                'hidden': False,
                'editable': True,
                'required': False,
                'default_value':'0',
            },
            {
                'form_name':'student_attendance_configuration',
                'column_name':'is_subject_attendance_staff_subject_map',
                'column_alias':'Is Subject and Standard list in Attendance page is staff permission Based',
                'description':'0:normal atttendance, 1:permission based',
                'hidden': False,
                'editable': True,
                'required': False,
                'default_value':'0',
            },
            {
                'form_name':'student_attendance_configuration',
                'column_name':'order_by_gender',
                'column_alias':'Order By Gender',
                'description':'0: order by name (default), 1: order by gender (Boy first, then Girl)',
                'hidden': False,
                'editable': True,
                'required': False,
                'default_value':'0',
            },
        ],
        'diary_form':[
                {
                    "form_name": 'diary_form',
                    "column_name": 'select_students',
                    "column_alias": '',
                    "description": '0: to be unselected, 1: to be all selected',
                    "hidden": 0,
                    "editable": 1,
                    "required": 1,
                    "default_value": 1
                },
                {
                    "form_name": 'diary_form',
                    "column_name": 'assign_teachers',
                    "column_alias": '',
                    "description": 'default user ids in array',
                    "hidden": 0,
                    "editable": 1,
                    "required": 1,
                    "default_value": '',
                },
                {
                    "form_name": 'diary_form',
                    "column_name": 'submission_date',
                    "column_alias": '',
                    "description":'default date: plus no of days, to not to select default date: -1',
                    "hidden": 0,
                    "editable": 1,
                    "required": 1,
                    "default_value": 1,
                },
                {
                    "form_name": 'diary_form',
                    "column_name": 'can_student_update',
                    "column_alias": '',
                    "description": '0: default not updatable, 1: default updatable',
                    "hidden": 1,
                    "editable": 0,
                    "required": 0,
                    "default_value": '0',
                },
                {
                    "form_name": 'diary_form',
                    "column_name": 'points',
                    "column_alias": '',
                    "description": '',
                    "hidden": 0,
                    "editable": 1,
                    "required": 0,
                    "default_value": '',
                },
                {
                    "form_name": 'diary_form',
                    "column_name": 'homework_description',
                    "column_alias": '',
                    "description": '',
                    "hidden": 0,
                    "editable": 0,
                    "required": 0,
                    "default_value": '',
                },
                {
                    'form_name': 'diary_form',
                    'column_name': 'show_subjects',
                    'column_alias': '',
                    'description': '',
                    'hidden': False,
                    'editable': True,
                    'required': False,
                    'default_value': '',
                },
                {
                    'form_name': 'diary_form',
                    'column_name': 'is_abacus_enabled',
                    'column_alias': '',
                    'description': '',
                    'hidden': False,
                    'editable': True,
                    'required': False,
                    'default_value': '',
                },
        ],
        'staff_attendance':[
            {
                "form_name": 'staff_attendance',
                "column_name": 'checkin',
                "column_alias": 'Check In',
                "description": 'a - to leave empty, b - shift start timings, c - current time',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": 'c'
            },
            {
                "form_name": 'staff_attendance',
                "column_name": 'checkout',
                "column_alias": 'Check out',
                "description": 'a - to leave empty, b - shift end timings, c - current time, d - take current time only after checkin already filled',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": 'd'
            },
            {
                "form_name": 'staff_attendance',
                "column_name": 'checkin_add_time',
                "column_alias": 'Check in add time',
                "description": 'n - minutes will be added based checkin field for default value only',
                "hidden": 0,
                "editable": 1,
                "required": 0,
                "default_value": 1
            },
            {
                "form_name": 'staff_attendance',
                "column_name": 'show_checout_after_checkin',
                "column_alias": '',
                "description": '0 - shows both checkin and checkout at a time. 1  - shows checkout only after checkin and checkin editable, 2  - shows checkout only after checkin and checkin non editable',
                "hidden": 0,
                "editable": 0,
                "required": 0,
                "default_value": 2
            },
            {
                "form_name": 'staff_attendance',
                "column_name": 'show_present_in_web_to_mark_present',
                "column_alias": '',
                "description": 'Show present button to mark the attendance in staff attendance ',
                "hidden": 0,
                "editable": 0,
                "required": 0,
                "default_value": 0
            }
        ],
        'dashboard_configuration' : [
            {
                'form_name': 'dashboard_configuration', 'column_name': 'show_pending_amount',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': 'Show Pending Amount in Dashboard Page'
            },
            {
                'form_name': 'dashboard_configuration', 'column_name': 'student_dashboard_view',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': '0: With modules heading. 1: Without modules heading.'
            },
            {
                'form_name': 'dashboard_configuration', 'column_name': 'staff_dashboard_view',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': '0: With modules heading. 1: Without modules heading.'
            },
            {
                'form_name': 'dashboard_configuration', 'column_name': 'text_to_display_in_from_text',
                'column_alias':'used_as_local_page_setting', 'default_value':'',
                'description': 'Default Birthday wishes From Staff Name or Institute Name Is Mentioned Here'
            },
            {
                'form_name': 'dashboard_configuration', 'column_name': 'hide_misc_fees_in_dashboard',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': '0: Show Miscellaneous Fees in Dashboard Page, 1: Hide Miscellaneous Fees in Dashboard Page'
            },
        ],
        'visitor_form': [
            {
                "form_name": 'visitor_form',
                "column_name": 'name',
                "column_alias": 'Visitor Name',
                "description": 'Visiting person name',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'building',
                "column_alias": 'Select Building',
                "description": 'Visitting building name',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'reason',
                "column_alias": 'Select Reason',
                "description": 'Visitting Reason',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'checkin',
                "column_alias": 'Check In',
                "description": '0: leave blank, 1: current date and time',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '1',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'checkout',
                "column_alias": 'Check Out',
                "description": '0: leave blank, 1: current date and time',
                "hidden": 0,
                "editable": 1,
                "required": 0,
                "default_value": '0',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'checkout_edit_form',
                "column_alias": 'Check Out',
                "description": 'Checkout Edit form - 0: leave blank, 1: current date and time',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '1',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'visiting_for',
                "column_alias": 'Visiting For',
                "description": 'Visitting For',
                "hidden": 0,
                "editable": 1,
                "required": 1,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'profile_pic',
                "column_alias": 'Capture',
                "description": 'Capture profile pic',
                "hidden": 0,
                "editable": 0,
                "required": 0,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'max_days_to_update',
                "column_alias": 'Max days to update',
                "description": 'Max days to update',
                "hidden": 0,
                "editable": 0,
                "required": 0,
                "default_value": '3',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'mobile_num',
                "column_alias": 'Mobile Number',
                "description": 'Mobile Number',
                "hidden": 0,
                "editable": 1,
                "required": 0,
                "default_value": '',
            },
            {
                "form_name": 'visitor_form',
                "column_name": 'verify_mobile_num',
                "column_alias": 'Verify And Submit',
                "description": 'Verify And Submit',
                "hidden": 0,
                "editable": 1,
                "required": 0,
                "default_value": 0,
            },
        ],
        'library_configuration' : [
            {
                'form_name': 'library_configuration', 'column_name': 'allow_to_edit_fine_amount',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': 'If set to 1 if user have fine amount we can give access to the user to edit fine amount'
            },
            {
                'form_name': 'library_configuration', 'column_name': 'lib_category_user_mapping',
                'column_alias':'used_as_local_page_setting', 'default_value':'[]',
                'description': 'temporary fix , User and Category mapping where we map membership and user mapping in the formdefinition [{"user": 1, "category": 1}] it should be valid json'
            }
        ],
        'setting_configuration' : [
            {
                'form_name': 'setting_configuration', 'column_name': 'theme_name',
                'column_alias':'used_as_local_page_setting', 'default_value':'',
                'description': 'You can check with frontend and set the theme name to change the theme colour in web'
            }
        ],
        'notification_configuration': [
            {
                'form_name': 'setting_configuration', 'column_name': 'notification_type',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': '0: show both circular and bulk notification 1: show only circular 2: show only bulk notification'
            }
        ],
        'staff_subject_mapping_configuration': [
            {
                'form_name': 'staff_subject_mapping_configuration', 'column_name': 'is_staff_standard_section_subject_mapping_enabled',
                'column_alias':'used_as_local_page_setting', 'default_value':'0',
                'description': '0: Staff will only be allocated to subject 1: Staff will be allocated to both standard section and subject'
            }
        ],
        'misc_configuration': [
            {
                'form_name': 'misc_configuration', 'column_name': 'guest_standard_non_mandatory',
                'column_alias': 'used_as_local_page_setting', 'default_value': '0',
                'description': '0: Guest Standard is mandatory in miscellaneous collection, 1: Guest Standard is non-mandatory'
            }
        ],
    }