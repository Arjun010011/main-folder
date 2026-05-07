import React, { useEffect } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from '@material-ui/core';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";

function HomeWorkListAction(props) {
  const {
    options,
    deleteHomeWork,
    viewHomeWork,
    editHomeWork,
    id,
    index,
    isViewOnly,
    update,
  } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showData, setShowData] = React.useState('');
  const [displayActions, setDisplayActions] = React.useState(false);

  const open = Boolean(anchorEl);
  const ITEM_HEIGHT = 48;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleClose();
    deleteHomeWork(id, index);
  };

  const handleView = () => {
    handleClose();
    viewHomeWork(id, index);
  };

  const handleEdit = () => {
    handleClose();
    editHomeWork(id, index);
  };

  const handleEvaluate = () => {
    handleClose();
    editHomeWork(id, index);
  };

  useEffect(() => {
    if (options.length > 0) {
      let showData=[]
      options.map((data) => {
        if(!isViewOnly || (isViewOnly && data==='View')){
          showData.push(data)
        }
      })
      showData = showData.join()
      setShowData(showData)
      setDisplayActions(true)
    }
  }, [showData])
  return (
    <div>
      <Tooltip title={showData} enterDelay={400}
        enterNextDelay={400} placement='top-start'
        classes={{ tooltip: 'tooltip-show-data' }}>
        <IconButton
          aria-label="more"
          aria-controls="long-menu"
          aria-haspopup="true"
          onClick={handleClick}
          className={displayActions ? 'padding-0' : 'display-none'}
        >
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: ITEM_HEIGHT * 7,
            width: 130,
          },
        }}
      >
        <MenuItem onClick={() => handleView()}>View</MenuItem>
        {options.includes("update") && update && !isViewOnly && (
          <MenuItem onClick={() => handleEdit()}>Edit</MenuItem>
        )}
        {options.includes("delete") && update && !isViewOnly && (
          <MenuItem onClick={() => handleDelete()}>Delete</MenuItem>
        )}
      </Menu>
    </div>
  );
}

HomeWorkListAction.propTypes = {
  options: PropTypes.array.isRequired,
  deleteHomeWork: PropTypes.func.isRequired,
  viewHomeWork: PropTypes.func.isRequired,
  editHomeWork: PropTypes.func.isRequired,
  id: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  // data: PropTypes.object.isRequired,
};

export default withRouter(HomeWorkListAction);
