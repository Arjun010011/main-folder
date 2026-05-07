import React from "react";
import { Box, Tooltip } from "@material-ui/core";
import PlayCircleFilledWhiteIcon from "@material-ui/icons/PlayCircleFilledWhite";
import PropTypes from "prop-types";

import { TRANSPORT_CODE } from "Constants";
import "./../styles.scss";
import { getSettingValue } from "Includes/functions";

const isResidential = parseInt(getSettingValue('is_residential'));
class MenuList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      feePlan: [],
    };
  }

  componentWillReceiveProps = (nextProps) => {
    if (nextProps.feePlanData !== this.state.feePlan) {
      const feePlan = [...nextProps.feePlanData];
      this.setState({ feePlan });
    }
  };

  getStudentType = (type) => {
    let studentTypeDesigns = {
      'Both': <Tooltip className="pointer" title="Both Residential and Day Scholar" placement="top-start" arrow>
                <span className='fs-12 vertical-align-super'> B </span>
              </Tooltip>,
      'Residential':  <Tooltip className="pointer" title="Residential" placement="top-start" arrow>
                        <span className='fs-12 vertical-align-super'> R </span>
                      </Tooltip>,
      'Day Scholar':  <Tooltip className="pointer" title="Day Scholar" placement="top-start" arrow>
                        <span className='fs-12 vertical-align-super'> D </span>
                      </Tooltip>
    }
    if( type in studentTypeDesigns ){
      return studentTypeDesigns[type]
    }
    return ''
  }
  
  render() {
    const { selectedFeePlan } = this.props;
    const { feePlan } = this.state;
    return (
      <Box className="menu-inner-box">
        {feePlan.map((menu, index) => {
          const error_class = menu.hasError ? "red-text red-border" : "";
          const box_class =
            selectedFeePlan.id === menu.id
              ? `selected-menu-item ${error_class}`
              : `unselected-menu-item ${error_class}`;
          return (
            <Box
              key={index}
              className={`menu-item ${box_class} pointer`}
              onClick={() => this.props.setFeePlan(menu)}
            >
              <Box className="flex-justify-space-between menu-item-box">
                <Box className="text-left">
                  <Box className="menu-name">{menu.fee_type_name} 
                    {!!isResidential &&  
                      this.getStudentType(menu.student_type)
                    }
                  </Box>
                  <Box className="text-left">
                    {menu.codename === TRANSPORT_CODE
                      ? `${menu.amount}%`
                      : `Rs. ${menu.amount}`}
                  </Box>
                </Box>
                <Box>
                  <PlayCircleFilledWhiteIcon className="menu-play-circle" />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }
}

MenuList.propTypes = {
  feePlanData: PropTypes.array,
};

MenuList.defaultProps = {
  feePlanData: [],
};
export default MenuList;
