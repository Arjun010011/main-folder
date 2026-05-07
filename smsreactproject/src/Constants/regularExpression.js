import { getDecimalRoundOff } from 'Includes/functions';
let decimalRegex = ""
if (getDecimalRoundOff) {
    decimalRegex = new RegExp(`^\\d+(\\.\\d{${getDecimalRoundOff()}})?$`)
}

export const amountRegex = { name: 'amountRegex', value: /^\d+(,\d{3})*$/, errorText: 'Invalid Amount' };///^\d+(,\d{3})*(\.\d{1,2})?$/
export const percentageRegex = { name: 'percentageRegex', value: /^\d{0,3}(\.\d{1,2})*$/, errorText: 'Invalid Percentage' };///^\d+(,\d{3})*(\.\d{1,2})?$/
export const nameRegex = { name: 'nameRegex', value: /^[a-zA-Z ]*$/, errorText: 'Only Alphabets are allowed' };
export const nameAndDotRegex = { name: 'nameAndDotRegex', value: /^[a-zA-Z .]*$/, errorText: 'Only Alphabets and Dot are allowed' };
export const nameWithQuoteRegex = { name: 'nameWithQuoteRegex', value: /^[a-zA-Z0-9 ,;'"\-./()&]*$/, errorText: `Only Alphabets and ( " ' - ,(),&) are allowed` };
export const nameWithQuoteAndWithoutZeroRegex = { name: 'nameWithQuoteAndWithoutZeroRegex', value: /^[a-zA-Z1-9 ,'"\-.()&]*$/, errorText: `Only Alphabets and ( " ' - ,(),&) are allowed` };
export const nameWithHashedRegex = { name: 'nameWithHashedRegex', value: /^[a-zA-Z0-9 #,'"-]*$/, errorText: `Only Alphabets and ( " ' - , #) are allowed` };
export const nameAndNumberRegex = { name: 'nameAndNumberRegex', value: /^([a-zA-Z0-9. ])*$/, errorText: 'Only Alpha Numerics are allowed Ex: abc 1' };
export const formulaNameRegex = { name: 'formulaNameRegex', value: /^[a-zA-Z0-9 .\-_()]*$/, errorText: 'Only Alpha Numerics and . - _ () are allowed' };
export const nameAndNumberAndHyphenRegex = { name: 'nameAndNumberAndHyphenRegex', value: /^[a-zA-Z0-9 -]*$/, errorText: 'Only Alpha Numerics and (-) are allowed' };
export const aadharNumberRegex = { name: 'aadharNumberRegex', value: /^\d{12}$/, errorText: 'Invalid Aaadhar Number. Format: 123456789012' };
export const dlNumberRegex = { name: 'dlNumberRegex', value: /^[a-zA-Z]{1,2}[0-9]{0,13}$/, errorText: 'Invalid DL Number. Format: AB0000000000000' };
export const vehicleNumberRegex = {
    name: 'vehicleNumberRegex', value: /^[a-z-A-Z]{2}[ -][0-9]{1,2}(?: [a-z-A-Z])?(?: [a-z-A-Z]*)? [0-9]{4}$/,
    errorText: 'Invalid Vehicle Number. Format: AB 01 CD 1234'
}
export const amountgreaterthanzero = { name: 'amountgreaterthanzero', value: /^[1-9][0-9]*$/, errorText: 'Amount should be greater than zero' }
export const numberRegex = { name: 'numberRegex', value: /^[0-9]*$/, errorText: 'Invalid Number', name: 'numberRegex' };
export const nameAndNumberWithSpecialCharacterRegex = { name: 'nameAndNumberWithSpecialCharacterRegex', value: /^[a-zA-Z0-9 !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/, errorText: 'Only Alpha Numericz and Specialcjarecters are allowed' };
export const numberAndDotRegex = { name: 'numberAndDotRegex', value: /^[0-9.]*$/, errorText: 'Invalid Number', name: 'numberRegex' };
export const floatNumberWithTwoDecimalRegex = { name: 'floatNumberWithTwoDecimalRegex', value: /^\d*(?:\.\d{1,2})?$/, errorText: 'Invalid Number Ex: 10.50 or 10' };
export const numberZeroToHunRegex = { name: 'numberZeroToHunRegex', value: /^([1-9][0-9]{0,1}|100)$/, errorText: 'Number should be between 1 to 100' }
export const gstinNumberRegex = {
    name: 'gstinNumberRegex', value: /^([0]{1}[1-9]{1}|[1-2]{1}[0-9]{1}|[3]{1}[0-7]{1})([a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9a-zA-Z]{1}[zZ]{1}[0-9a-zA-Z]{1})+$/,
    errorText: 'Invalid GSTIN Number. Format: 22AAAAA0000A1Z2'
};
export const faxNumberRegex = {
    name: 'faxNumberRegex', value: /^(\+?\d{1,}(\s?|\-?)\d*(\s?|\-?)\(?\d{2,}\)?(\s?|\-?)\d{3,}\s?\d{3,})$/,
    errorText: 'Invalid FAX Number. Format: 11111111222'
};
export const pinCodeRegex = {
    name: 'pinCodeRegex', value: /^\d{6}$/,
    errorText: 'Invalid Pincode . Format: 123456'
};
export const phoneRegex = {
    name: 'phoneRegex', value: /^\+91\d{10}$/,
    errorText: 'Invalid value . Format: 919999999999'
};
export const emailRegex = {
    name: 'emailRegex', value: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    errorText: 'Invalid Email'
};
export const panNumberRegex = { name: 'panNumberRegex', value: /^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/, errorText: 'Invalid PAN Number. format: ALWPG5809L' };
export const bankAccountNumberRegex = { name: 'bankAccountNumberRegex', value: /^([0-9]){9,18}\s*$/, errorText: 'Account No. should be between 9-18 digits only' };
export const bankIfscRegex = { name: 'bankIfscRegex', value: /^[A-Z]{4}0[A-Z0-9]{6}$/, errorText: 'valid format: SBIN0005943' };
export const pfNumberRegex = { name: 'pfNumberRegex', value: /^([A-Z]){5}([0-9]){12,18}?$/, errorText: 'Invalid PF Number Example: MHBAN00578850000000691' };
export const passwordRegex = { name: 'passwordRegex', value: /^[a-zA-Z0-9.!#$%&@’*+/=?^_`{|}~-]{8}/, errorText: 'Password Should Contain Atleast 8 characters' }
export const bplNumberRegex = { name: 'bplNumberRegex', value: /^([a-zA-Z0-9]){8,12}\s*$/, errorText: 'BPL Number should be range between 8 to 12 AlphaNumerics' }
export const amountRegexWithDecimals = { name: 'amountRegexWithDecimals', value: /^\d+(,\d{3})*(\.\d{1,2})?$/, errorText: 'Invalid Amount' };///^\d+(,\d{3})*(\.\d{1,2})?$/
export const nameAndUnderScoreRegex = { name: 'nameAndDotRegex', value: /^[a-z1-9A-Z_]*$/, errorText: 'Only Alphabets and _  are allowed' };
export const hexCodeRegex = { name: 'hexCodeRegex', value: /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/, errorText: 'Invalid Hex Code' };