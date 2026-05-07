import React from "react";
import { Button } from "@material-ui/core";
import PropTypes from "prop-types";
import './styles.scss';

const MuiToolbar = (props) => {
  return (
    <div className="toolbar-select">
      <Button
        className="toolbar-button"
        onClick={() => {
          props.showEnableFeaturePopup(props.selectedRows);
        }}
      >
        {props.name}
      </Button>
    </div>
  );
}

MuiToolbar.propTypes = {
  name: PropTypes.string.isRequired,
  selectedRows: PropTypes.array.isRequired,
  showEnableFeaturePopup: PropTypes.func.isRequired
};

export default MuiToolbar;