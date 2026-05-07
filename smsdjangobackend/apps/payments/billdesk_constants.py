BILLDESK_CREATE_ORDER_CALL={
    'currency':356,
    'itemcode':"DIRECT",
    'init_channel':"internet",
    'user_agent':"Mozilla/5.0",
    'accept_header': "text/html",
    'browser_tz': "-330",  # for +5:30
    'browser_color_depth': "32",
    'browser_java_enabled': "false",
    'browser_screen_height': "601",
    'browser_screen_width': "657",
    'browser_language': "en-US",
    'browser_javascript_enabled': "true"
}
BILLDESK_API_CALL={
    'Content-Type' : "application/jose",
    'Accept' : "application/jose"
}
BILLDESK_ORDER_STATUSES = {
    'paid': "PAID",
    'active': "ACTIVE",
    'expired': "EXPIRED"
}
BILLDESK_PAYMENT_STATUSES_CODES = {
  'failed' : "0399",
  'pending' : "0002",
  'success' : "0300",
  'not_found' : "404"
}
BILLDESK_PAYMENT_CATEGORY = {
    '01' : "Netbanking",
    '02' : "Credit Card",
    '03' : "Debit Card",
    '04' : "Cashcard",
    '05' : "Wallet",
    '07' : "Reward Points",
    '10' : "UPI: Bank Account",
    '11' : "BharatQR",
    '12' : "Loan EMI",
    '13' : "NEFT",
    'UPI': "Credit Card",
    '19' : "NACH",
    '20' : "CBDC",
    '21' : "UPI: Prepaid Wallet"
}
BILLDESK_FRONTEND_URL = {
    'module':'https://pay.billdesk.com/jssdk/v1/dist/billdesksdk/billdesksdk.esm.js',
    'nomodule':'https://pay.billdesk.com/jssdk/v1/dist/billdesksdk.js',
    'css':'https://pay.billdesk.com/jssdk/v1/dist/billdesksdk/billdesksdk.css'
}
BILLDESK_REFUND_STATUSES_CODES = {
    'refunded': "0799", 
    'cancelled': "0699", 
}
BILLDESK_PAYMENT_STATUSES = {
  'failed': "FAILED",
  'pending': "PENDING",
  'success': "SUCCESS",
  'not_found': "NOTFOUND",
  'success_in_billdesk_failed_in_edubricz':"EDUBRICZFAIL"
}
BILLDESK_REFUND_STATUSES = {
    'success' : "SUCCESS",
    'pending' : "PENDING",
    'onhold' :"ONHOLD"
}
BILLDESK_PAYMENTS_METHODS_CONFIG = {
    'DEBIT_CARD_TRANSACTION_FEE': {
        'name': 'Debit Card',
        'value': 'debit_card',
        'bValue': 'dc',
        'is_generic': True,
        'min_fees': {
            'billdesk': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'CREDIT_CARD_TRANSACTION_FEE': {
        'name': 'Credit Card',
        'value': 'credit_card',
        'bValue': 'cc',
        'is_generic': True,
        'min_fees': {
            'billdesk': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'NET_BANKING_TRANSACTION_FEE': {
        'name': 'NetBanking',
        'value': 'netbanking',
        'bValue': 'nb',
        'is_generic': True,
        'min_fees': {
            'billdesk': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'UPI_TRANSACTION_FEE': {
        'name': 'UPI',
        'value': 'upi',
        'bValue': 'upi',
        'is_generic': True,
        'min_fees': {
            'billdesk': { 'percentage': 0, 'amount': 10  }
        }
    },
    'UPI_PAYMENT_LINK_FEE': {
        'name': 'UPI Payment Link',
        'value': 'upi_payment_link',
        'bValue': 'upi_payment_link',    
        'is_generic': False,
        'min_fees': {
            'billdesk': { 'percentage': 0, 'amount': 10  }
        }
    }
}