import React from 'react'
import { Card, CardContent, Box, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'relative',
        height: '100%',
        borderRadius: 14,
        transition: 'all 0.25s ease',
        backgroundColor: '#fff',
        overflow: 'hidden',

        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 10px 30px rgba(25,118,210,0.15)',
        },

        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            height: 3,
            width: '100%',
            backgroundColor: theme.palette.primary.main,
            transform: 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.25s ease',
        },

        '&:hover::before': {
            transform: 'scaleX(1)',
        },
    },

    content: {
        padding: '16px 18px !important',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    title: {
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.6px',
        color: theme.palette.text.secondary,
        textTransform: 'uppercase',
    },

    value: {
        marginTop: 6,
        fontWeight: 700,
        fontSize: '1.15rem',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
    },

    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: '#f4f8ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
    },
}))

const SummaryCard = ({
    label,
    value,
    icon,
    color = '#4680FF',
}) => {
    const classes = useStyles()

    return (
        <Card className={classes.root} elevation={1}>
            <CardContent className={classes.content}>
                <Box>
                    <Typography className={classes.title}>
                        {label}
                    </Typography>

                    <Typography
                        className={classes.value}
                        style={{ color }}
                    >
                        {value}
                    </Typography>
                </Box>

                {icon && (
                    <Box
                        className={classes.iconWrapper}
                        style={{ color }}
                    >
                        {icon}
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}

export default SummaryCard
