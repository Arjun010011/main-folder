import React, { Component } from 'react';
import TextField from '@material-ui/core/TextField';

export default class InputSearchBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldValues: { ...props.fieldDetails },
            fieldErrors: {}
        }
    }

    onchange = (e) => {
        const { value } = e.target;
        this.props.onChangeSearchField(value);
    }

    render() {
        const { fieldValues } = this.props;
        return (
            <div>
                <TextField
                    label={fieldValues.label}
                    type="name"
                    value={fieldValues.value ? fieldValues.value : ""}
                    onChange={(e)=>this.onchange(e)}
                    fullWidth
                />
            </div>
        )
    }
}