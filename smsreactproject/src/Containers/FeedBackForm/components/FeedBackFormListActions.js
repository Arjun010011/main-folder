import React, { useEffect } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@material-ui/core';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import { withRouter } from 'react-router-dom'
import { getRequest } from 'Includes/api/apicall';

const ITEM_HEIGHT = 35;

function FeedBackFormListActions(props) {

    const { id, index, deleteStudent, editURL, enabledActions, delete_label, isFinalized, access, creator, user } = props;
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [displayActions, setDisplayActions] = React.useState(false);
    const [showData, setShowData] = React.useState('');
    let [enabledActionsNew, setEnabledAction] = React.useState('');

    const openMenu = Boolean(anchorEl);


    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleEdit = (extraParams = {}) => {
        let { editExtraParams, editExtraParamsUrl } = props;
        let searchParam = "?" + new URLSearchParams(editExtraParams).toString()
        props.history.push({
            pathname: editURL,
            state: { detail: id, ...editExtraParams },
            search: searchParam,
        });
    }
    const handleDelete = () => {
        handleCloseMenu();
        deleteStudent(id, index)
    }

    useEffect(() => {
        if (enabledActions.length > 0) {
            let showData
            if (enabledActions.length > 1) {
                let arrData = []
                arrData = enabledActions.map((data) => {
                    if (data === 'update') {
                        return (isFinalized || !access['update']) ? 'view' : 'edit'
                    }
                    return data
                })
                let indexDelete = arrData.indexOf('delete')
                if (parseInt(creator) !== parseInt(user) && index !== -1) {
                    arrData.splice(indexDelete, 1)
                }
                enabledActionsNew = arrData
                showData = arrData.join('/ ');
            }
            else {
                enabledActionsNew = enabledActions
                showData = enabledActions.join()
            }
            setShowData(showData)
            setDisplayActions(true)
            setEnabledAction(enabledActionsNew)
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
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 7,
                        width: 130,
                    },
                }}
            >
                {enabledActionsNew.includes('view') && <MenuItem onClick={handleEdit}>
                    View
                </MenuItem>}
                {enabledActionsNew.includes('edit') && <MenuItem onClick={handleEdit}>
                    Edit
                </MenuItem>}
                {enabledActionsNew.includes('delete') && <MenuItem onClick={handleDelete}>
                    {delete_label ? delete_label : 'Delete'}
                </MenuItem>}
            </Menu>
        </div>
    );
}
export default withRouter(FeedBackFormListActions)