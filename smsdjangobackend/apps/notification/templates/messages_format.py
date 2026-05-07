common_html_data_email = '<div style="font-family: Helvetica,Arial,sans-serif;;overflow:auto;line-height:2;box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;"><div style="margin:50px auto;width:80%;padding:20px 0"><div style="border-bottom:1px solid #eee;display:flex"><div style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">{institute_name}</div></div><p style="font-size:1.1em">Hi,</p><p>{html_data}</p><hr style="border:none;border-top:1px solid #eee" /><div style="font-size:1.em;color: #00466a;text-decoration:none;font-weight:600"> <a style="text-decoration: none" href="http://www.edubricz.com/"> Powered by Edubricz </a> </div></div></div>'
common_html_data_push = ''

#-------------------------------------------------------------Attendance Data -------------------------------------------------

attendance_create_email = '{student_name} is {status} on {fordate} - {session} <br/><br/> Thanks, <br/> {staffname}'
attendance_create_sms =  'Hi {student_name}, {status} on {fordate} - {session} Thanks, {staffname} - {sms_brand_name}'
attendance_create_push = 'Hi <br/> {student_name} is {status} on {fordate} - {session} <br/><br/>Thanks, {staffname}'
attendance_create_webpush = 'Hi {student_name} is {status} on {fordate} - {session} Thanks, {staffname}'
attendance_create_whatsapp = 'Hi {student_name} is {status} on {fordate} - {session} Thanks, {staffname}'

attendance_create_email_for_other_user = '{student_name} is {status} on {fordate} - {session} <br/><br/> Thanks, <br/> {staffname}'
attendance_create_push_for_other_user = 'Hi <br/> {student_name} is {status} on {fordate} - {session} <br/><br/>Thanks, {staffname}'
attendance_create_whatsapp_for_other_user = 'Hi <br/> {student_name} is {status} on {fordate} - {session} <br/><br/>Thanks, {staffname}'

staff_attendance_create_email = 'Attendence marked <br/><br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}'
staff_attendance_create_sms =  'Attendence marked <br/><br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}'
staff_attendance_create_push = 'Attendence marked <br/><br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}'
staff_attendance_create_webpush = 'Attendence marked <br/><br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}'
staff_attendance_create_whatsapp = 'Attendence marked <br/><br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}'

staff_attendance_create_email_for_other_user = 'Attendence marked <br/><br/> Staff name:{staffname} <br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}<br/>For date:{fordate}'
staff_attendance_create_push_for_other_user = 'Attendence marked <br/><br/> Staff name:{staffname} <br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}<br/>For date:{fordate} Duration : {duration} hours'
staff_attendance_create_sms_for_other_user= 'Attendence marked <br/><br/>Staff name:{staffname} <br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}<br/>For date:{fordate}'
staff_attendance_create_webpush_for_other_user= 'Attendence marked <br/><br/>Staff name:{staffname} <br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}<br/>For date:{fordate}'
staff_attendance_create_whatsapp_for_other_user= 'Attendence marked <br/><br/>Staff name:{staffname} <br/>Intime:{intime} <br/>Outtime:{outtime},<br/>Status:{status}<br/>For date:{fordate}'

subject_attendance_create_email = "{student_name} was marked as {status} in {subject} on {fordate} from {from_time} to {to_time}.<br/><br/>Thank you."
subject_attendance_create_sms =  "{student_name} was marked as {status} in {subject} on {fordate} from {from_time} to {to_time}.<br/><br/>Thank you.{sms_brand_name}"
subject_attendance_create_push = "{student_name} was marked as {status} in {subject} on {fordate} from {from_time} to {to_time}.Thank you."
subject_attendance_create_webpush = "{student_name} was marked as {status} in {subject} on {fordate} from {from_time} to {to_time}.<br/><br/>Thank you."
subject_attendance_create_whatsapp = "{student_name} was marked as {status} in {subject} on {fordate} from {from_time} to {to_time}.<br/><br/>Thank you."

batch_attendance_create_email = "Hi, We would like to inform you that {student_name} was {status} on {fordate} during the Special Class.<br/><br/>Thank you.{institute_name}"
batch_attendance_create_sms =  "Hi, We would like to inform you that {student_name} was {status} on {fordate} during the Special Class.<br/><br/>Thank you.{institute_name}-{sms_brand_name}"
batch_attendance_create_push = "Hi, We would like to inform you that {student_name} was {status} on {fordate} during the Special Class.Thank you."
batch_attendance_create_webpush = "Hi, We would like to inform you that {student_name} was {status} on {fordate} during the Special Class.<br/><br/>Thank you."
batch_attendance_create_whatsapp = "Hi, We would like to inform you that {student_name} was {status} on {fordate} during the Special Class.<br/><br/>Thank you..{institute_name}"

#--------------------------------------------------------------Hostel Data ----------------------------------------------------

pocket_money_deposit_email = '{student_name} <br/>Pocket Money Rs : {amount}'
pocket_money_deposit_sms = 'Hi {student_name}, Pocket Money Withdrawal of Rs : {amount} for the student. - {sms_brand_name}'
pocket_money_deposit_push = 'Hi <br/> {student_name} Pocket Money Rs : {amount} Deposited for the student.'
pocket_money_deposit_webpush = 'Hi {student_name} Pocket Money Rs : {amount} Deposited for the student.'
pocket_money_deposit_whatsapp = 'Hi {student_name} Pocket Money Rs : {amount} Deposited for the student.'

pocket_money_withdraw_email = '{student_name} <br/>Pocket Money Withdrawl of Rs : {amount} for the student.'
pocket_money_withdraw_sms = 'Hi {student_name}, Pocket Money Withdrawal of Rs : {amount} for the student. - {sms_brand_name}'
pocket_money_withdraw_push = 'Hi <br/> {student_name} \n Pocket Money Withdrawl of Rs : {amount} for the student.'
pocket_money_withdraw_webpush = 'Hi {student_name} Pocket Money Withdrawl of Rs : {amount} for the student.'
pocket_money_withdraw_whatsapp = 'Hi {student_name} Pocket Money Withdrawl of Rs : {amount} for the student.'

pocket_money_reutrnback_email = '{student_name} <br/>Pocket Money Return backed of Rs : {amount} for the student.'
pocket_money_reutrnback_sms = 'Hi {student_name}, Pocket Money Return backed of Rs : {amount} for the student. - {sms_brand_name}'
pocket_money_reutrnback_push = 'Hi <br/> {student_name} Pocket Money Return backed of Rs : {amount} for the student.'
pocket_money_reutrnback_webpush = 'Hi {student_name} Pocket Money Return backed of Rs : {amount} for the student.'
pocket_money_reutrnback_whatsapp = 'Hi {student_name} Pocket Money Return backed of Rs : {amount} for the student.'

#----------------------------------------------------- Enrollment ---------------------------------------------------------------

enrollment_create_email = '{student_name} <br/> Student Enrolled to {standard_name} {section_name} in the Academic year {start_year} - {end_year}'
enrollment_create_sms = 'Hi {student_name} Student Enrolled to {standard_name} {section_name} in the Academic year {start_year} - {end_year} - {sms_brand_name}'
enrollment_create_push = 'Hi <br/> {student_name} Student Enrolled to {standard_name} {section_name} in the Academic year {start_year} - {end_year}'
enrollment_create_webpush = 'Hi {student_name} Student Enrolled to {standard_name} {section_name} in the Academic year {start_year} - {end_year}'
enrollment_create_whatsapp = 'Hi {student_name} Student Enrolled to {standard_name} {section_name} in the Academic year {start_year} - {end_year}'

#----------------------------------------------------- Promote Student -----------------------------------------------------------

promotestudent_create_email = 'Congratulations! <br/> {student_name} is promoted to {to_standard} All the best'
promotestudent_create_sms = 'Congratulations! {student_name} is promoted to {to_standard} All the best - {sms_brand_name}'
promotestudent_create_push = 'Congratulations! <br/> {student_name} is promoted to {to_standard} <br/>All the best'
promotestudent_create_webpush = 'Congratulations! \n {student_name} is promoted to {to_standard} \nAll the best'
promotestudent_create_whatsapp = 'Congratulations! \n {student_name} is promoted to {to_standard} \nAll the best'

#----------------------------------------------------- Diary Chat ---------------------------------------------------------------

diary_chat_create_email = '{student_name} Homework status marked (Status: {status} , Marks: {marks} )'
diary_chat_create_sms = 'Hi {student_name} Homework status marked (Status: {status} , Marks: {marks} ) - {sms_brand_name}'
diary_chat_create_push = '{student_name} <br/> Homework status marked (Status: {status} , Marks: {marks} )'
diary_chat_create_webpush = '{student_name} Homework status marked (Status: {status} , Marks: {marks} )'
diary_chat_create_whatsapp = '{student_name} Homework status marked (Status: {status} , Marks: {marks} )'

#----------------------------------------------------- Diary Create ---------------------------------------------------------------

diary_create_email = '<br /> {title}'
diary_create_sms = 'New Homework Created - {title} - {sms_brand_name}'
diary_create_push = '<br/> HomeWork - {title}'
diary_create_webpush = '\n HomeWork - {title}'
diary_create_whatsapp = '\n HomeWork - {title}'

#----------------------------------------------------- Rfid Attendance ---------------------------------------------------------------
rfid_attendance_create_email = '{student_name} - Checkin - {in_time} <br/> Checkout - {out_time} <br /> fordate = {for_date} <br/> status = {status}'
rfid_attendance_create_sms =  '{student_name} - Checkin - {in_time} Checkout - {out_time} fordate = {for_date} - {sms_brand_name} status = {status}'
rfid_attendance_create_push = '{student_name} - Checkin - {in_time} \n Checkout - {out_time} \n fordate = {for_date} \n status = {status}'
rfid_attendance_create_webpush = '{student_name} - Checkin - {in_time} \n Checkout - {out_time} \n fordate = {for_date} \n status = {status}'
rfid_attendance_create_whatsapp = '{student_name} - Checkin - {in_time} \n Checkout - {out_time} \n fordate = {for_date} \n status = {status}'


#-----------------------------------------------------  Student Admission Form ---------------------------------------------------------------

studentall_create_email = 'Admission form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}. Standard - {standard_name}. <br /> Login credentials <br /> Username : {username} <br /> Use Email/Mobile Otp to set password or ask Institute for default password'
studentall_create_sms = 'Admission form for the student {student_name} is successful. Academic year {start_year} - {end_year}. Standard - {standard_name} Login credentials Username : {username} Use Email/Mobile Otp to set password or ask Institute for default password - {sms_brand_name}'
studentall_create_push = 'Admission form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}. Standard - {standard_name} <br/> Login credentials \n Username : {username}. <br/> Use Email/Mobile Otp to set password or ask Institute for default password'
studentall_create_webpush = 'Admission form for the student {student_name} is successful. \n Academic year {start_year} - {end_year}. Standard - {standard_name} \n Login credentials \n Username : {username}. \n Use Email/Mobile Otp to set password or ask Institute for default password'
studentall_create_whatsapp = "Congratulations! We're delighted to inform you that admission for student {student_name} at {school_name} for standard {standard_name} has been successfully processed.\
To get started, please use the following details:\
Android App: [{student_app_android}]\
iOS App: [{student_app_ios}]\
School Code: {school_code}\
Username: {username}\
Password: {password}\
Welcome to the Edubricz family!"

#-----------------------------------------------------  Student Concession  ---------------------------------------------------------------

concession_create_email = 'Concession Applied for student {student_name} is successful. PFB details <br /> <br /> Concession Name: {concession_name} <br/> Standard : {standard_name} <br /> Academic Year : {start_date} - {end_date} <br/> Concession Amount : {total_concession_amount}'
concession_create_sms = 'Concession Applied for student {student_name} is successful. PFB details Concession Name: {concession_name} Standard : {standard_name} Academic Year : {start_date} - {end_date} Concession Amount : {total_concession_amount} - {sms_brand_name}'
concession_create_push = 'Concession Applied for student {student_name} is successful. PFB details <br/> Concession Name: {concession_name} <br/> Standard : {standard_name} <br/> Academic Year : {start_date} - {end_date} <br/> Concession Amount : {total_concession_amount}'
concession_create_webpush = 'Concession Applied for student {student_name} is successful. PFB details \n \n Concession Name: {concession_name} \n Standard : {standard_name} \n Academic Year : {start_date} - {end_date} \n Concession Amount : {total_concession_amount}'
concession_create_whatsapp = 'Concession Applied for student {student_name} is successful. PFB details \n \n Concession Name: {concession_name} \n Standard : {standard_name} \n Academic Year : {start_date} - {end_date} \n Concession Amount : {total_concession_amount}'

#-----------------------------------------------------  Student Concession ---------------------------------------------------------------

feature_create_email = 'The following fee/feature(s) are {status} for the student {student_name} for the academic year {academic_year}. <br/ > {available_features}'
feature_create_sms = 'The following fee/feature(s) are {status} for the student {student_name} for the academic year {academic_year}. - {available_features} - {sms_brand_name}'
feature_create_push = 'The following fee/feature(s) are {status} for the student {student_name} for the academic year {academic_year}. <br/> {available_features}'
feature_create_webpush = 'The following fee/feature(s) are {status} for the student {student_name} for the academic year {academic_year}. \n {available_features}'
feature_create_whatsapp = 'The following fee/feature(s) are {status} for the student {student_name} for the academic year {academic_year}. \n {available_features}'

#-----------------------------------------------------  Student Concession ---------------------------------------------------------------

feecollection_create_email = 'This is to confirm that Fee payment is successful for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} <br /> Please find the attached Fee Receipt.'
feecollection_create_sms = 'This is to confirm that Fee payment is successful for the student {student_name}. Total Amount of Rs {payment_total_amount}. - {sms_brand_name}'
feecollection_create_push = 'This is to confirm that Fee payment is successful for the student {student_name}. <br /> Total Amount of Rs {payment_total_amount}'
feecollection_create_webpush = 'This is to confirm that Fee payment is successful for the student {student_name}. <br /> Total Amount of Rs {payment_total_amount}'
feecollection_create_whatsapp ='Dear {student_name},\
This is to confirm that your fee payment has been successfully processed. The total amount of Rs. {payment_total_amount} has been received.\
Best regards,\
{school_name}'
feecollection_create_email_for_other_user= 'This is to confirm that Fee payment is successful for the student {student_name} <br />standard {standard_name} <br />Academic Year : {start_date} - {end_date} ,<br />Total Amount of Rs {payment_total_amount}'
feecollection_create_sms_for_other_user = 'This is to confirm that Fee payment is successful for the student {student_name}. Total Amount of Rs {payment_total_amount}. - {sms_brand_name}'
feecollection_create_push_for_other_user= 'This is to confirm that Fee payment is successful for the student {student_name} <br />standard {standard_name} <br />Academic Year : {start_date} - {end_date} <br /> Total Amount of Rs {payment_total_amount}'
feecollection_create_webpush_for_other_user= 'This is to confirm that Fee payment is successful for the student {student_name} <br />standard {standard_name} <br />Academic Year : {start_date} - {end_date} <br /> Total Amount of Rs {payment_total_amount}'
feecollection_create_whatsapp_for_other_user= 'This is to confirm that Fee payment is successful for the student {student_name} <br />standard {standard_name} <br />Academic Year : {start_date} - {end_date} <br /> Total Amount of Rs {payment_total_amount}'

feecollection_destroy_email = 'This is to confirm that Fee payment is deleted successfully for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} for the Receipt {receipt_num}'
feecollection_destroy_sms = 'This is to confirm that Fee payment is deleted successfully for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} for the Receipt {receipt_num}'
feecollection_destroy_push = 'This is to confirm that Fee payment is deleted successfully for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} for the Receipt {receipt_num}'
feecollection_destroy_webpush = 'This is to confirm that Fee payment is deleted successfully for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} for the Receipt {receipt_num}'
feecollection_destroy_whatsapp = 'This is to confirm that Fee payment is deleted successfully for the student {student_name}.<br />Total Amount of Rs {payment_total_amount} for the Receipt {receipt_num}'

#-----------------------------------------------------  Miscellaneous ---------------------------------------------------------------

misc_create_email = 'This is to confirm that Miscellaneous fee payment is successful for the {student_name}. Please Find the attached Receipt'
misc_create_sms = '	This is to confirm that Miscellaneous fee payment is successful for the {student_name}. Total Amount : {amount} - {sms_brand_name}'
misc_create_push = 'This is to confirm that Miscellaneous fee payment is successful for the {student_name}.<br/> Total Amount : {amount}'
misc_create_webpush = 'This is to confirm that Miscellaneous fee payment is successful for the {student_name}. Total Amount : {amount}'
misc_create_whatsapp = 'This is to confirm that Miscellaneous fee payment is successful for the {student_name}. Total Amount : {amount}'

#-----------------------------------------------------  Application Form Create ---------------------------------------------------------------

application_create_email = 'Application form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}.<br /> Standard - {standard_name}.'
application_create_sms = 'Application form for the student {student_name} is successful. Academic year {start_year} - {end_year}. Standard - {standard_name} - {sms_brand_name}'
application_create_push = 'Application form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}. <br/> Standard - {standard_name}'
application_create_webpush = 'Application form for the student {student_name} is successful. \n Academic year {start_year} - {end_year}. \n Standard - {standard_name}'
application_create_whatsapp = 'Application form for the student {student_name} is successful. \n Academic year {start_year} - {end_year}. \n Standard - {standard_name}'

#-----------------------------------------------------  Employee Monthly Plan ---------------------------------------------------------------

salaryemployeemonthplan_create_email = 'Salary for the month {salary_month} {salary_month_year} is processed Successfully.PFA payslip'
salaryemployeemonthplan_create_sms = 'Salary for the month {salary_month} {salary_month_year} is processed Successfully. Amount - {amount} - {sms_brand_name}'
salaryemployeemonthplan_create_push = 'Salary for the month {salary_month} {salary_month_year} is processed Successfully. <br/>Amount - {amount}'
salaryemployeemonthplan_create_webpush = 'Salary for the month {salary_month} {salary_month_year} is processed Successfully. Amount - {amount}'
salaryemployeemonthplan_create_whatsapp = 'Salary for the month {salary_month} {salary_month_year} is processed Successfully. Amount - {amount}'

#-----------------------------------------------------  Staff create  ---------------------------------------------------------------

staffalldetail_create_email = 'Entry Created Successfully. <br /> Please report to {reporting_staff_name}. <br /> Login Username : {username}. <br/> Set password using (Mobile | Email) OTP  / Ask Institute for default password'
staffalldetail_create_sms = 'Entry Created Successfully. Please report to {reporting_staff_name}. Login Username : {username}. Set password using (Mobile | Email) / Ask Institute for default password - {sms_brand_name}'
staffalldetail_create_push = 'Entry Created Successfully. <br/> Please report to {reporting_staff_name}. \n Login Username : {username}. Set password using (Mobile | Email) / Ask Institute for default password'
staffalldetail_create_webpush = 'Entry Created Successfully. \n Please report to {reporting_staff_name}. \n Login Username : {username}. Set password using (Mobile | Email) / Ask Institute for default password'
staffalldetail_create_whatsapp = "Credentials for Edubricz Staff App Access\
Dear Staff,\
You can access your ward’s details using the credentials below:\
🔹 Android App: {staff_app_android}\
🔹 iOS App: {staff_app_ios}\
🔹 School Code: {school_code}\
🔹 Username: {username}\
🔹 Password: {password}\
If you have any issues logging in, feel free to reach out.\
Best regards,\
{school_name}"


#-----------------------------------------------------  Staff Update  ---------------------------------------------------------------

staffalldetail_update_email = 'Staff Update Successfully. <br /> Please report to {reporting_staff_name}.'
staffalldetail_update_sms = 'Staff Update Successfully. Please report to {reporting_staff_name}. - {sms_brand_name}'
staffalldetail_update_push = 'Staff Update Successfully. \n Please report to {reporting_staff_name}.'
staffalldetail_update_webpush = 'Staff Update Successfully. \n Please report to {reporting_staff_name}.'
staffalldetail_update_whatsapp = "Credentials for Edubricz Staff App Access\
Dear Staff,\
You can access your ward’s details using the credentials below:\
🔹 Android App: {staff_app_android}\
🔹 iOS App: {staff_app_ios}\
🔹 School Code: {school_code}\
🔹 Username: {username}\
🔹 Password: {password}\
If you have any issues logging in, feel free to reach out.\
Best regards,\
{school_name}"

assignshift_create_email = '{staff_name} have been assigned to shift {shift_name}. Please Find below details of shift <br /> Date Range: {fromdate} - {todate} <br/ >{day_details} '
assignshift_create_sms = '{staff_name} have been assigned to shift {shift_name}. Please Find below details of shift Date Range: {fromdate} - {todate} {day_details} - {sms_brand_name}'
assignshift_create_push = '{staff_name} have been assigned to shift {shift_name}. Please Find below details of shift <br/> Date Range: {fromdate} - {todate} {day_details}'
assignshift_create_webpush = '{staff_name} have been assigned to shift {shift_name}. Please Find below details of shift \n Date Range: {fromdate} - {todate} {day_details}'
assignshift_create_whatsapp = '{staff_name} have been assigned to shift {shift_name}. Please Find below details of shift \n Date Range: {fromdate} - {todate} {day_details}'

assignshift_update_email = 'Shift Update for {staff_name} have been assigned to shift {shift_name}. Please Find below details of shift <br /> Date Range: {fromdate} - {todate} <br/ >{day_details} '
assignshift_update_sms = 'Shift Update for {staff_name} have been assigned to shift {shift_name}. Please Find below details of shift Date Range: {fromdate} - {todate} - Day Name {day_details} - {sms_brand_name}'
assignshift_update_push = 'Shift Update for  {staff_name} have been assigned to shift {shift_name}. Please Find below details of shift <br/> Date Range: {fromdate} - {todate} {day_details}'
assignshift_update_webpush = 'Shift Update for {staff_name} have been assigned to shift {shift_name}. Please Find below details of shift \n Date Range: {fromdate} - {todate} {day_details}'
assignshift_update_whatsapp = 'Shift Update for {staff_name} have been assigned to shift {shift_name}. Please Find below details of shift \n Date Range: {fromdate} - {todate} {day_details}'

itemsold_create_email = 'Hi {user_full_name} <br/> <br/> {table_data} Please find below details of item(s) issued on {for_date}. Total Amount - {total_amount}'
itemsold_create_sms = 'Hi {user_full_name} {table_data} Please find below details of item(s) issued on {for_date}. Total Amount - {total_amount}'
itemsold_create_push = 'Hi {user_full_name} <br/>{table_data} Please find below details of item(s) issued on {for_date}. Total Amount - {total_amount}'
itemsold_create_webpush = 'Hi {user_full_name} {table_data} Please find below details of item(s) issued on {for_date}. Total Amount - {total_amount}' 
itemsold_create_whatsapp = 'Hi {user_full_name} {table_data} Please find below details of item(s) issued on {for_date}. Total Amount - {total_amount}' 

#-------------------------------------------------------- Adjustment Approval  ------------------------------------------------------------------
adjustment_approval_email = 'Hi {requested_to}, <br/> {requested_by_user} has requested to {approval_type} the Fee Adjustment. <br/> For Student {student_name}'
adjustment_approval_sms = 'Hi {requested_to}, {requested_by_user} has requested to {approval_type} the Fee Adjustment. For Student {student_name}'
adjustment_approval_push = 'Hi {requested_to}, {requested_by_user} has requested to {approval_type} the Fee Adjustment. For Student {student_name}'
adjustment_approval_webpush = 'Hi {requested_to}, {requested_by_user} has requested to {approval_type} the Fee Adjustment. For Student {student_name}'
adjustment_approval_whatsapp = 'Hi {requested_to}, {requested_by_user} has requested to {approval_type} the Fee Adjustment. For Student {student_name}'

#------------------------------------------------------- Staff Daily Attendance ------------------------------------------------------------------
staff_daily_attendance_email = 'Please find the attached file for daily staff attendance report'
staff_daily_attendance_sms = 'Please find the attached file for daily staff attendance report'
staff_daily_attendance_push = 'Please find the attached file for daily staff attendance report'
staff_daily_attendance_webpush = 'Please find the attached file for daily staff attendance report'
staff_daily_attendance_whatsapp = 'Please find the attached file for daily staff attendance report'

#------------------------------------------------------- Standard Daily Attendance ------------------------------------------------------------------
student_daily_attendance_email = 'Please find the attached file for daily student attendance report'
student_daily_attendance_sms = 'Please find the attached file for daily student attendance report'
student_daily_attendance_push = 'Please find the attached file for daily student attendance report'
student_daily_attendance_webpush = 'Please find the attached file for daily student attendance report'
student_daily_attendance_whatsapp = 'Please find the attached file for daily student attendance report'

#------------------------------------------------------- Student UserName And Password ------------------------------------------------------------------
username_password_bulk_notification_sms_student = "Admission for the student {name} is successfull for standard {standard_name} android link : {student_app_android} ios: {student_app_ios} School Code : {school_code} Username : {username} Password: {password} Edubricz"
username_password_bulk_notification_whatsapp_student = "Congratulations! We're delighted to inform you that admission for student {name} at {school_name} for {standard_name} has been successfully processed.\
To get started, please use the following details:\
Android App: [{student_app_android}]\
iOS App: [{student_app_ios}]\
School Code: {school_code}\
Username: {username}\
Password: {password}\
Welcome to the {school_code} family!"
username_password_bulk_notification_sms_staff = "Dear staff, Use the following credentials to access your ward details Android link : {staff_app_android} IOS Link: {staff_app_ios} School Code : {school_code} Username : {username} Password : {password} - Edubricz"
username_password_bulk_notification_whatsapp_staff = "Credentials for Edubricz Staff App Access\
Dear Staff,\
You can access your ward’s details using the credentials below:\
🔹 Android App: {staff_app_android}\
🔹 iOS App: {staff_app_ios}\
🔹 School Code: {school_code}\
🔹 Username: {username}\
🔹 Password: {password}\
If you have any issues logging in, feel free to reach out.\
Best regards,\
{school_name}"

username_password_bulk_notification_email_student = "Dear Parent {father_name}, <br/> \
                                Student Name : {name}<br/> \
                                Class: {standard_name}<br/> \
                                Section: {section_name}<br/> \
                                To access your ward details like Attendance / Grades / Assignments / Announcements / Feedback forms, please use the \
                                following credentials<br/> School Code: {school_code} <br/> Your Username is: {username} <br/> Your password \
                                is: {password}<br/><br/> {admission_num} <br/><br/> You can always change your password by doing the following: <br/> \
                                1. Sign in to {app_link} ( app link)<br/> 2. Click on Profile > Click on Change Password<br/> For security reasons we \
                                recommend you not to share your password with anyone.<br/> DO NOT REPLY TO THIS MESSAGE. For further help please contact \
                                support {school_email}<br/>Dhanyavad,<br/>TEAM {school_name} <br/>"

username_password_bulk_notification_email_staff = "Dear Staff {name}, <br/> \
                                To access your ward details like Attendance / Grades / Assignments / Announcements / Feedback forms, \
                                please use the following credentials<br/> School Code: {school_code} <br/> Your Username is: {username} <br/> Your password is: {password} <br/><br/> You can always change your password by \
                                doing the following: <br/> 1. Sign in to {app_link} ( app link)<br/> \
                                2. Click on Profile > Click on Change Password<br/> For security reasons we recommend you  \
                                not to share your password with anyone.<br/> DO NOT REPLY TO THIS MESSAGE. \
                                For further help please contact support {school_email}<br/>Dhanyavad,<br/>TEAM {school_name} <br/>"

                                
#------------------------------------------------------- Geofence ------------------------------------------------------------------
gps_geofence_create_email = "We wanted to inform you that the school bus has departed from the school and is on its way to the designated {pickup_or_drop} points. Please be ready at the usual {pickup_or_drop} location.<br/> \
                                Edubricz"
gps_geofence_create_push = "We wanted to inform you that the school bus has departed from the school and is on its way to the designated {pickup_or_drop} points. Please be ready at the usual {pickup_or_drop} location. Edubricz"
gps_geofence_create_sms = "Your commute has started from awesome school Edubricz"
gps_geofence_create_webpush = "Your commute has started from awesome school Edubricz"
gps_geofence_create_whatsapp = "We wanted to inform you that the school bus has departed from the school and is on its way to the designated {pickup_or_drop} points. Please be ready at the usual {pickup_or_drop} location. Edubricz"
#------------------------------------------------------- GPSETA ------------------------------------------------------------------
gps_eta_create_email = "We wanted to inform you that your child {student_name}'s school bus is {distance} km away from the {pickup_or_drop} point and will be reaching shortly.<br/> \
                        Edubricz"
gps_eta_create_push = "We wanted to inform you that your child {student_name}'s school bus is {distance} km away from the {pickup_or_drop} point and will be reaching shortly. Edubricz"
gps_eta_create_sms = "Your commute has started from awesome school Edubricz"
gps_eta_create_webpush = "Your commute has started from awesome school Edubricz"
gps_eta_create_whatsapp = "We wanted to inform you that your child {student_name}'s school bus is {distance} km away from the {pickup_or_drop} point and will be reaching shortly. Edubricz"

#---------------------------------------------------Student Enquiry Form--------------------------------------------------------
enquiry_create_email = 'Enquiry form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}. <br/ > Standard - {standard_name}.'
enquiry_create_push = 'Enquiry form for the student {student_name} is successful. <br/> Academic year {start_year} - {end_year}. <br/> Standard - {standard_name}'
enquiry_create_webpush = 'Enquiry form for the student {student_name} is successful. \n Academic year {start_year} - {end_year}. \n Standard - {standard_name}'
enquiry_create_sms = 'Dear Parents, \n\nThank you for the admission enquiry of your {student_relate}, {student_name} to {standard_name}. \nPls contact {institute_phone_num} for queries. \n{school_name} \nEdubricz'
enquiry_create_whatsapp = 'Enquiry Form Submission Successful\
Dear {student_name}\
We are pleased to inform you that your enquiry form has been successfully submitted.\
📅 Academic Year: {start_year}-{end_year}\
📚 Standard: {standard_name}\
Our team will get in touch with you soon with further details. If you have any questions, feel free to reach out.\
Best regards,\
{school_name}'

#---------------------------------------------------Visitor Management --------------------------------------------------------
visitor_management_create_whatsapp = ''