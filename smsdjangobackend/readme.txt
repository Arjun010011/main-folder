Om New Company Deployment

1. Run migration
2. Run python3 manage.py uploadurl
3. Run python3 manage.py inittutorial
4. Add school details from signup page
5. create super user
6. Insert country city state district


Whenever new urls or permission added 

run create-url-json from front end and run uploadurl command
OR use sync flow: CreateUrlJson "Export for Deploy Sync", commit permissions_export.json, then:
  sh server.sh -s   (syncpermissions) or python manage.py syncpermissions --file permissions_export.json 


Remove the mode_of_payment from fee_collection once it works well

sh server.sh -z edubricz@123 - To Update the password



Bill Desk Configuration :

BILLDESK_URL = 'https://uat1.billdesk.com/u2'
SECRET = 'Ai3w5IN8TmqofgGZUJPlwyPv1r4xGbOB'
Mercid and password

1.Create a Google Cloud Project:

Go to the Google Cloud Console.
Create a new project or select an existing one.

2.Enable the Google Sheets API:

In your project, go to the Google Sheets API page.
Enable the API.

3.Create a Service Account:

Go to the Credentials page in Google Cloud Console.
Click "Create Credentials" → "Service Account."
Give it a name, and select "Create and Continue."
Once created, go to your service account details and generate a JSON key file. This will be used to authenticate your Django app.

4.Share the Google Sheet with the Service Account Email:

Open the Google Sheet you want to work with.
Share it with the email address of your service account (found in the JSON file).



-------------------------- To Get Error Mails From Server -----------------------------

Go to google account -> enable 2 step verification -> generate app password 

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_HOST_USER = 'noreplyedubricz@gmail.com'
EMAIL_HOST_PASSWORD = 'kvgl gluw pjmt ttxz'

SERVER_EMAIL = 'edubricz@gmail.com'

ADMINS = [
        ('edubricz', 'edubricz@gmail.com'),
]
  


Cursor developments:
 
 /time-table/bulk-assign

 /time-table/auto-generate

Accounting Module (Tally-like Financial Management):
 
 /finance/accounting - Comprehensive accounting module with 12 report types
 /finance/tally - Basic Tally view (Ledger, Day Book, Trial Balance)
 
 Features:
 - Day Book, Ledger, Trial Balance, Cash/Bank Book, Profit & Loss
 - Cash-in-Hand, Fixed Assets, Bank Accounts, Sundry Debtors
 - Loans & Advances, Staff Advances, Cash Tracking
 - Bank Master, Collection Routing, Gateway Ledger
 - Bank Deposit/Contra, Bank Reconciliation, Manual Bank Entry
 
 Documentation: /docs/ACCOUNTING_MODULE.md
 Quick Reference: /docs/ACCOUNTING_QUICK_REFERENCE.md


 Shuffle Student 

 Custom Design templates
 

 bulk change standard

 question paper build

 http://localhost:3000/finance/dashboard

 active staffs and deleted staffs r

 need to check shikshandara sibling report issue is there 

 misc showing is study certificate already issued


 Finance Dashboard:

 All report done 

 when fee paid signals written
 Need to handle : adjustment , concession , feature enable , fine enabled - show the warning 


 Download sats pending things need to check the sats medium and standard id according to sats update screen need to build and test once how sats works
 also check the sats attendance count

 http://localhost:3000/hr/staff/attendance/view

 Staff status update fixed check once and push

 NIGHTINGALE APPLICATION FEES
 Added uploading image in s3 for company logo and company exta images to use in invoices
