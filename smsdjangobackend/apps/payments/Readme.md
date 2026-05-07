ONLINE PAYMENT TESTING SCENARIOS:-

order_status:-status of order id - created by edubricz
payment_status:- status of the transaction - created by billdesk
cf_transaction_id :- billdesk transaction id 
amount :- amount_paid 
transaction_fee :- transaction fee paid by student
mode_of_payment :- selected in billdesk
status :- is updated in fee collection
vendor_transaction_fee :- amount to transfer from edubricz to school account
expiry_time :- given by billdesk

1. Fee payment:-

	SUCCESS:-
	1. ORDER STATUS :- PAID
	2. PAYMENT STATUS :- SUCCESS
	3. status :- 1
	
	FAILURE:-
	1. ORDER STATUS :- PAID
	2. PAYMENT STATUS :- FAILURE
	3. status : 0
	
	ONLY CREATED ORDER ID PAYMENT NOT DONE :-
	1. ORDER STATUS : ACTIVE
	2. PAYMENT STATUS :- NOT_ATTEMPTED
	3. status : 0
	
	IF ORDER ID EXPIRED from billdesk:-
	1. ORDER STATUS : EXPIRED
	2. PAYMENT STATUS : NOT_ATTEMPTED
	3. status :0
	
	If payment tried to do after some buffer time mentioned in form definition:-
	1. ORDER STATUS : PAID
	2. PAYMENT STATUS : EDUBRICZFAIL
	3. STATUS : 0
	raise exceptions.ValidationError('Payment Failed Because Payment Done After expiry time')
	
	If amount,transaction fee, mode of payment in bill desk is not matching with edubricz:-
	1. ORDER STATUS : PAID
	2. PAYMENT STATUS : EDUBRICZFAIL
	3. STATUS : 0
	raise exceptions.ValidationError('Payment Failed Bacause Bill Desk response data amount is not matching the edubricz amount')
	
	IF transaction is pending:-
	1. ORDER STATUS : PAID
	2. PAYMENT STATUS : PENDING
	3. STATUS :0
	
Now we have 2 expiry time one is edubricz expiry time other is billdesk expiry time
1.once the billdesk payment page is opened user can pay within 30 mins but after the buffer time of edubricz if he pays it will become EDUBRICZFAIL
2. Payment page will be blocked upto edubricz buffer time after that he can make other payment and other order id will be created and it will be active and also previous order id will be active for 30 mins


	

Nikhil things to do 

1. Need to store the payment gateway that is done in the new page 
2. ONEPAY_PAYMENT_STATUSES Need the payment statuses
3. check other payment gateway is getting updated 
4. check upi app opens
7. after payment refresh fee pay page