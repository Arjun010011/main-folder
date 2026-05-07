import React, { Component } from 'react'
import DetailsFillForm from './DetailsFillForm'
import ProfileFormInfo from './ProfileFormInfo'
import { Paper, Grid } from '@material-ui/core'
import Box from '@material-ui/core/Box';

export default class ProfileForm extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: {},
            profile: 0
        }
    }
    onClicked = (key, e) => {
        this.setState({
            profile: key,
        })
    }

    render() {
        return (
            <div>
                <Box>
                    <DetailsFillForm change={this.onClicked} />
                </Box>
                <ProfileFormInfo data={this.state.data} profile={this.state.profile} />
            </div>
        )
    }
}
