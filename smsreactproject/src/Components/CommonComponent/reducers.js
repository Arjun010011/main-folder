import { fromJS } from "immutable";
import { combineReducers } from "redux";
const initialState = fromJS({});
function rootReducer(state = initialState, action) {
  switch (action.type) {
    case "ACADEMIC_YEAR":
      return state.set("academic_year", action.payload.data);
    case "ENQUIRY_FORM":
      return state.set("enquiry_form", action.payload.data);
    case "APPLICATION_FORM":
      return state.set("application_form", action.payload.data);
    case "MODE_OF_PAYMENT_LIST":
      return state.set("mode_of_payment_list", action.payload.data);
    default:
      return state;
  }
}
export default rootReducer;
