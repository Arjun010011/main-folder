import React from "react";
import { Button } from "@material-ui/core";

export default  function CustomToolbarSelect(props) {
  React.useEffect(() => {
      if( props.selectedRows.data ){
        props.checkBoxSelected(false);
      }else{
        props.checkBoxSelected(true)
      }
  }, []);
  return (
    <div className={"custom-toolbar-select"}>
      <Button
        className={"collect-fees"}
        onClick={() => {
          props.showEnableFeaturePopup(
            props.selectedRows,
            "multiple"
          );
        }}
      >
        Enable Membership
      </Button>
    </div>
  );
 }
