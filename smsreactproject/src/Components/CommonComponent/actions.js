export function userDetails(user) {
	return { type: "USER_DETAILS", payload: user }
}

export function setAcademicYear(response) {
	return {
		type: 'ACADEMIC_YEAR',
		payload: {
			data: response
		}
	}
}

export function setEnquiryFormList(response) {
	return {
		type: 'ENQUIRY_FORM',
		payload: {
			data: response
		}
	}
}

export function setApplicationFormList(response) {
	return {
		type: 'APPLICATION_FORM',
		payload: {
			data: response
		}
	}
}

export function setLoginApplicationFormList(response) {
	return {
		type: 'LOGIN_APPLICATION_FORM',
		payload: {
			data: response
		}
	}
}

export function setAdmissionFormList(response) {
	return {
		type: 'ADMISSION_FORM',
		payload: {
			data: response
		}
	}
}

export function setStaffFormList(response) {
	return {
		type: 'STAFF_FORM',
		payload: {
			data: response
		}
	}
}

export function setModeOfPaymentList(response) {
	return {
		type: 'MODE_OF_PAYMENT_LIST',
		payload: {
			data: response
		}
	}
}