ONEPAY_CREATE_ORDER_CALL={
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
ONEPAY_API_CALL={
    'Content-Type' : "application/jose",
    'Accept' : "application/jose"
}
ONEPAY_ORDER_STATUSES = {
    'paid': "PAID",
    'active': "ACTIVE",
    'expired': "EXPIRED",
    'failed': 'FAILED'
}

ONEPAY_PAYMENT_CATEGORY = {
}
ONEPAY_FRONTEND_URL = {
}
ONEPAY_REFUND_STATUSES_CODES = {
}
# Response code nikhil need to update rest of payment status
ONEPAY_PAYMENT_STATUSES = {
    'failed': "FAILED",
    'pending': "PENDING",
    'success': "SUCCESS",
    'not_found': "NOTFOUND",
    'timeout': "TIMEOUT",
    'success_in_onepay_failed_in_edubricz':"EDUBRICZFAIL"
}
ONEPAY_PAYMENT_STATUSES_CODES = {
    'failed': "F",
    'success': "Ok",
    'pending': "Pending",
    'timeout': "To",
}
ONEPAY_REFUND_STATUSES = {
    'success' : "SUCCESS",
    'pending' : "PENDING",
    'onhold' : "ONHOLD"
}
ONEPAY_MODE_OF_PAYMENT_MAPPING = {

}
ONEPAY_PAYMENTS_METHODS_CONFIG = {
}