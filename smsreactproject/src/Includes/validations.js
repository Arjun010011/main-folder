import { amountRegex, percentageRegex } from "Constants/regularExpression";
import { AMOUNT_MAX_VALUE } from "Constants";

export const validateAmount = (value, required, minAmount, maxAmount) => {
  if (value === "" && Boolean(required)) {
    return { errorFound: true, errorText: "Amount Field Cannot be empty" };
  }
  if (value === "" && !Boolean(required)) {
    return { errorFound: false, errorText: "" };
  }
  if (!amountRegex.value.test(value)) {
    return { errorFound: true, errorText: amountRegex.errorText };
  } else if (
    amountRegex.value.test(value) &&
    AMOUNT_MAX_VALUE < parseFloat(value)
  ) {
    return { errorFound: true, errorText: "" };
  } else if (Boolean(minAmount) && parseFloat(minAmount) > parseFloat(value)) {
    return { errorFound: true, errorText: `Minimum Amount is ${minAmount}` };
  } else if (Boolean(maxAmount) && parseFloat(maxAmount) < parseFloat(value)) {
    return { errorFound: true, errorText: `Maximum Amount is ${maxAmount}` };
  }
  return { errorFound: false, errorText: "" };
};

export const validatePercent = (value, required) => {
  if (value === "" && Boolean(required)) {
    return { errorFound: true, errorText: "Field Cannot be empty" };
  }
  if (value === "" && !Boolean(required)) {
    return { errorFound: false, errorText: "" };
  }
  if (!percentageRegex.value.test(value)) {
    return { errorFound: true, errorText: percentageRegex.errorText };
  } else if (0 > parseFloat(value)) {
    return { errorFound: true, errorText: `Minimum Value is 0` };
  } else if (100 < parseFloat(value)) {
    return { errorFound: true, errorText: `Maximum Value is 100` };
  }
  return { errorFound: false, errorText: "" };
};
