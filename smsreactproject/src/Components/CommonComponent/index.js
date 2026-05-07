import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';

import { setAcademicYear } from './actions';
import { getRequest } from  'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';  
import { checkAuthentication } from 'Includes/functions';
// import "font-awesome/css/font-awesome.css";

class CommonComponent extends React.Component { 
  componentDidMount(){
    checkAuthentication();
    // this.getAcademicYearList()
  }

  getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api
    const params = { is_active: true }
    getRequest(url, params, this.props).then(response => {
        if (response && response.status === 200) {
            // this.setState({
            //     academicYearList: response.data.data,
            //     loading: false
            // })
            this.props.setAcademicYear(response.data);
        }
    })
}
  render() {
    return (
      <div></div>
    );
  } 
}


const mapStateToProps = createStructuredSelector({
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    setAcademicYear
  }, dispatch);
}
export default connect(mapStateToProps, mapDispatchToProps)(CommonComponent);