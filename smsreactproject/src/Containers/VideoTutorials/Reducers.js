import { fromJS } from 'immutable';
import { combineReducers } from 'redux';
const initialState = fromJS({
    
});
function rootReducer(state = initialState, action) {
    switch (action.type) {
        case 'PREVIEW_URL' : return state.set("preview_url", action.payload.data)
        
        default:
            return state;
    }
}
export default rootReducer