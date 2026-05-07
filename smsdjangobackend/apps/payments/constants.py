PAYMENTS_METHODS_CONFIG = {
    'DEBIT_CARD_TRANSACTION_FEE': {
        'name': 'Debit Card',
        'value': 'debit_card',
        'bValue': 'dc',
        'is_generic': True,
        'min_fees': {
            'cashfree': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'CREDIT_CARD_TRANSACTION_FEE': {
        'name': 'Credit Card',
        'value': 'credit_card',
        'bValue': 'cc',
        'is_generic': True,
        'min_fees': {
            'cashfree': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'NET_BANKING_TRANSACTION_FEE': {
        'name': 'NetBanking',
        'value': 'netbanking',
        'bValue': 'nb',
        'is_generic': True,
        'min_fees': {
            'cashfree': { 'percentage': 2.1, 'amount': 10  }
        }
    },
    'UPI_TRANSACTION_FEE': {
        'name': 'UPI',
        'value': 'upi',
        'bValue': 'upi',
        'is_generic': True,
        'min_fees': {
            'cashfree': { 'percentage': 0.1, 'amount': 10  }
        }
    },
    'UPI_PAYMENT_LINK_FEE': {
        'name': 'UPI Payment Link',
        'value': 'upi_payment_link',
        'bValue': 'upi_payment_link',    
        'is_generic': False,
        'min_fees': {
            'cashfree': { 'percentage': 0.1, 'amount': 10  }
        }
    }
}

PAYMENT_TIMEOUT = 16
CASHFREE_ORDER_STATUSES = {
    'paid': 'PAID',
    'active': 'ACTIVE',
    'expired': 'EXPIRED'
}

CASHFREE_PAYMENT_STATUSES = {
  'cancelled': "CANCELLED", 
  'failed': 'FAILED',
  'not_attempted': "NOT_ATTEMPTED", 
  'pending': "PENDING",
  'success': "SUCCESS", 
  'user_dropped': "USER_DROPPED", 
  'void': "VOID",
  'temporarily_disabled': 'TEMPORARILY_DISABLED' 
}

CASHFREE_REFUND_STATUSES = {
    'success': "SUCCESS", 
    'pending': "PENDING", 
    'cancelled': "CANCELLED", 
    'onhold': "ONHOLD", 
    'failed': "FAILED"
}
BANK_CODES = [
    { "code": 3003, "name": "Axis Bank" },
    { "code": 3005, "name": "Bank of Baroda - Retail Banking" },
    { "code": 3006, "name": "Bank of India" },
    { "code": 3007, "name": "Bank of Maharashtra" },
    { "code": 3009, "name": "Canara Bank" },
    { "code": 3010, "name": "Catholic Syrian Bank" },
    { "code": 3011, "name": "Central Bank of India" },
    { "code": 3012, "name": "City Union Bank" },
    { "code": 3016, "name": "Deutsche Bank" },
    { "code": 3017, "name": "DBS Bank Ltd" },
    { "code": 3018, "name": "DCB Bank - Personal" },
    { "code": 3019, "name": "Dhanlakshmi Bank" },
    { "code": 3020, "name": "Federal Bank" },
    { "code": 3021, "name": "HDFC Bank" },
    { "code": 3022, "name": "ICICI Bank" },
    { "code": 3023, "name": "IDBI Bank" },
    { "code": 3024, "name": "IDFC FIRST Bank" },
    { "code": 3026, "name": "Indian Bank" },
    { "code": 3027, "name": "Indian Overseas Bank" },
    { "code": 3028, "name": "IndusInd Bank" },
    { "code": 3029, "name": "Jammu and Kashmir Bank" },
    { "code": 3030, "name": "Karnataka Bank Ltd" },
    { "code": 3031, "name": "Karur Vysya Bank" },
    { "code": 3032, "name": "Kotak Mahindra Bank" },
    { "code": 3033, "name": "Laxmi Vilas Bank - Retail Net Banking" },
    { "code": 3037, "name": "Punjab & Sind Bank" },
    { "code": 3038, "name": "Punjab National Bank - Retail Net Banking" },
    { "code": 3039, "name": "RBL Bank" },
    { "code": 3040, "name": "Saraswat Bank" },
    { "code": 3041, "name": "Shamrao Vitthal Co-operative Bank" },
    { "code": 3042, "name": "South Indian Bank" },
    { "code": 3043, "name": "Standard Chartered Bank" },
    { "code": 3044, "name": "State Bank Of India" },
    { "code": 3051, "name": "Tamil Nadu State Co-operative Bank" },
    { "code": 3052, "name": "Tamilnad Mercantile Bank Ltd" },
    { "code": 3054, "name": "UCO Bank" },
    { "code": 3055, "name": "Union Bank of India" },
    { "code": 3058, "name": "Yes Bank Ltd" },
    { "code": 3060, "name": "Bank of Baroda - Corporate" },
    { "code": 3061, "name": "Bank of India - Corporate" },
    { "code": 3062, "name": "DCB Bank - Corporate" },
    { "code": 3064, "name": "Lakshmi Vilas Bank - Corporate" },
    { "code": 3065, "name": "Punjab National Bank - Corporate" },
    { "code": 3066, "name": "State Bank of India - Corporate" },
    { "code": 3067, "name": "Union Bank of India - Corporate" },
    { "code": 3071, "name": "Axis Bank Corporate" },
    { "code": 3072, "name": "Dhanlaxmi Bank Corporate" },
    { "code": 3073, "name": "ICICI Corporate Netbanking" },
    { "code": 3074, "name": "Ratnakar Corporate Banking" },
    { "code": 3075, "name": "Shamrao Vithal Bank Corporate" },
    { "code": 3076, "name": "Equitas Small Finance Bank" },
    { "code": 3077, "name": "Yes Bank Corporate" },
    { "code": 3079, "name": "Bandhan Bank- Corporate banking" },
    { "code": 3080, "name": "Barclays Corporate- Corporate Banking - Corporate" },
    { "code": 3081, "name": "Indian Overseas Bank Corporate" },
    { "code": 3083, "name": "City Union Bank of Corporate" },
    { "code": 3084, "name": "HDFC Corporate" },
    { "code": 3086, "name": "Shivalik Bank" },
    { "code": 3087, "name": "AU Small Finance" },
    { "code": 3089, "name": "Utkarsh Small Finance Bank" },
    { "code": 3090, "name": "The Surat People’s Co-operative Bank Limited" },
    { "code": 3091, "name": "Gujarat State Co-operative Bank Limited" },
    { "code": 3092, "name": "HSBC Retail Netbanking" },
    { "code": 3094, "name": "Andhra Pragathi Grameena Bank" },
    { "code": 3096, "name": "Bassien Catholic Coop Bank" },
    { "code": 3098, "name": "Capital Small Finance Bank" },
    { "code": 3100, "name": "ESAF Small Finance Bank" },
    { "code": 3101, "name": "Fincare Bank" },
    { "code": 3102, "name": "Jana Small Finance Bank" },
    { "code": 3103, "name": "Jio Payments Bank" },
    { "code": 3104, "name": "Janata Sahakari Bank Ltd Pune" },
    { "code": 3105, "name": "Kalyan Janata Sahakari Bank" },
    { "code": 3106, "name": "The Kalupur Commercial Co-Operative Bank" },
    { "code": 3107, "name": "Karnataka Vikas Grameena Bank" },
    { "code": 3108, "name": "Maharashtra Gramin Bank" },
    { "code": 3110, "name": "North East Small Finance Bank Ltd" },
    { "code": 3111, "name": "NKGSB Co-op Bank" },
    { "code": 3113, "name": "Karnataka Gramin Bank" },
    { "code": 3114, "name": "RBL Bank Limited - Corporate Banking" },
    { "code": 3115, "name": "SBM Bank India" },
    { "code": 3116, "name": "Suryoday Small Finance Bank" },
    { "code": 3117, "name": "The Sutex Co-op Bank Ltd" },
    { "code": 3118, "name": "Thane Bharat Sahakari Bank Ltd" },
    { "code": 3119, "name": "TJSB Bank" },
    { "code": 3120, "name": "Varachha Co-operative Bank Limited" },
    { "code": 3121, "name": "Zoroastrian Co-Operative Bank Ltd" },
    { "code": 3122, "name": "UCO Bank Corporate" },
    { "code": 3123, "name": "Airtel Payments Bank" },
]
PENDING_PAYMENT_STATUSES = ['NOT_ATTEMPTED', 'VOID', 'PENDING']
FAILED_PAYMENT_STATUSES = ['FAILED', 'USER_DROPPED', 'CANCELLED']

CASHFREE_FRONTEND_URL = 'https://api.cashfree.com/pg'

PAYMENT_GATEWAYS_DATA_MAP = {
    'cashfree': 'cashfree',
    'paytm': 'paytm',
    'billdesk': 'billdesk',
    'onepay': 'onepay'
}

REFUND_REQUEST_TYPES={
    '1':'Requested',
    '2':'Accepted',
    '3':'Rejected',
    '4':'Rejected because of edubricz fault'
}
