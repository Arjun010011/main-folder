import React, { Component } from 'react'
import {
     Checkbox, ListItemText, List, ListItem, ListItemIcon, ListItemSecondaryAction,
     Button, IconButton, Collapse
} from '@material-ui/core';
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

class SelectStandardSection extends Component {

    render() {
        const { standardList } = this.props;
        return (
            <div>
                <List component="nav">
                    {standardList.map((standard, parentIndex) => (
                        <div key={parentIndex}>
                            <ListItem dense>
                                <ListItemIcon className='exam-list-item-icon'>
                                    <Checkbox
                                        disableRipple
                                        edge="start"
                                        checked={standard.checked}
                                        defaultChecked={standard.checked}
                                        onClick={() =>
                                            this.props.handleCheckClick(parentIndex)
                                        }
                                    />
                                </ListItemIcon>
                                <ListItemIcon>
                                    <Button
                                        disableFocusRipple
                                        disableRipple
                                        variant="outlined"
                                        size="small"
                                    >
                                        {standard.name.toUpperCase()}
                                    </Button>
                                </ListItemIcon>
                                <ListItemSecondaryAction>
                                    {standard.id !== 0 &&
                                        <IconButton
                                            onClick={() =>
                                                this.props.handleExpandClick(parentIndex)
                                            }
                                        >
                                            {standard.expanded ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                    }
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Collapse
                                unmountOnExit
                                in={standard.expanded || false}
                                timeout="auto"
                            >
                                <List disablePadding component="div">
                                    {standard.sections.map((section, childIndex) => (
                                        <ListItem
                                            key={section.id}
                                            dense
                                            className='exam-list-tem-left-padding'
                                        >
                                            <ListItemIcon className='exam-list-item-icon'>
                                                <Checkbox
                                                    checked={section.checked}
                                                    defaultChecked={section.checked}
                                                    onClick={() =>
                                                        this.props.handleCheckClick(
                                                            parentIndex,
                                                            childIndex
                                                        )
                                                    }
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={section.name}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        </div>
                    ))}
                </List>

            </div>
        )
    }
}
export default SelectStandardSection




