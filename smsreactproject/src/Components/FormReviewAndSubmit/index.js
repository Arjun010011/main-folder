import React, { Component } from 'react'
import { Paper, Grid, Typography, withStyles, Divider, Box, Button, Avatar } from '@material-ui/core';
import classNames from 'classnames'
import backgroundSchoolView from 'images/backgroundSchoolView.png'
import PropTypes from 'prop-types';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const Styles = theme => ({
    review: {
        color: '#4680FF',
        fontWeight: '500',
        fontSize: '23px',
        lineHeight: '20px',
        paddingLeft: '20px'
    },
    subheading: {
        fontSize: '17px',
        lineHeight: '20px',
        color: '#637381',
        paddingLeft: '20px'

    },
    divStyle: {
        width: '100%',
        padding: '40px'
    },
    studentHeading: {
        color: '#4680FF',
        fontWeight: '500',
        fontSize: '20px',
        lineHeight: '18px',
        paddingLeft: '10px',
        width: '100%',
    },
    studentLabel: {
        color: '#00000',
        fontSize: '12px',
        lineHeight: '23px',
        wordBreak: 'break-word',

    },
    studentValue: {
        color: '#00000',
        fontSize: '16px',
        lineHeight: '25px',
        textTransform: 'capitalize',
        wordBreak: 'break-word',

    },
    studentValueEmpty: {
        padding: '5px',
        width: '40px'
    },
    header: {
        padding: '10px 15px',
    },
    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        // marginLeft: 'auto',
        marginRight: '5%',
    },
    displayFlex: {
        display: 'flex',
        padding: '20px 0px'
    },
})


class StudentReviewAndSubmit extends Component {
    constructor(props) {
        super(props)

        this.state = {

        }
    }
    return_field_value = (data) => {
        let isImage = false
        if (data.type === 'image') {
            isImage = true
        }
        let temp = '';
        if (isImage && !data.value) {
            temp = <Avatar />
        } else if (isImage && data.value) {
            temp = <img src={data.value} onClick={this.handleLargePreview} style={{ cursor: 'pointer' }} />
        } else if (!isImage && !data.value) {
            temp = <Box style={{ width: "40px" }}>
                <hr />
            </Box>
        } else if (!isImage && data.value !== "") {
            temp = data.value
        }
        return <Box
            display="flex"
            justifyContent="flex-start"
            className={classNames(
                data.className,
                "dataValue break-word"
            )}
        >
            {temp}
        </Box>
    }

    render() {
        let { student, classes, heading, sub_heading, isTerm } = this.props
        return (
            <Paper className='paper-plain-background p-b-20px'>
                <Grid container className="header-align flex-justify-center-flex-prop p-t-20px">
                    <Box className='form-left-heading'>
                        {heading}
                    </Box>
                </Grid>
                <Grid container className='margin-top-30'>
                    {student.map((headingData, index) => {
                        return (
                            <Grid item md={12} xs={12} sm={12} key={index} className={classes.displayFlex}>
                                <Grid container>
                                    <Box className={classes.studentHeading}>{headingData.sub_heading}</Box>
                                    {headingData.data.map((data, index) => {
                                        return (
                                            (data.label && data.type !== 'image') &&
                                            <Grid item md={data?.md ?? 3} xs={12} sm={12} key={index} className={classes.header}>
                                                <Box className={classes.studentLabel}>{data.label}</Box>
                                             {!data.list && !data.table && (
                                                this.return_field_value(data)
                                            )}

                                        </Grid>
                                        )
                                    })
                                    }
                                    <Grid item md={12} xs={12}>
                                        <Box mt={3} mb={3}>
                                            <Divider />
                                        </Box>
                                    </Grid>
                                </Grid>

                            </Grid>
                        )
                    })
                    }
                </Grid>
                {
                    !isTerm &&
                    <Box display='flex' justifyContent='flex-end'>
                        <Box>
                            <Button variant='contained'
                                color='primary'
                                disabled={this.props.disabled}
                                onClick={this.props.check}
                                className={classNames(classes.submit, 'submit')}
                            >
                                <FormattedMessage {...commonMessages.submit} />
                            </Button>
                        </Box>
                    </Box>
                }
            </Paper>
        )
    }
}


StudentReviewAndSubmit.propTypes = {
    student: PropTypes.array,
    heading: PropTypes.string.isRequired,
    sub_heading: PropTypes.string,
}

StudentReviewAndSubmit.defaultProps = {
    heading: 'Stranger'
};
export default withStyles(Styles)(StudentReviewAndSubmit)