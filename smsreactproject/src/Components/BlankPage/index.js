import React from 'react'
import Box from '@material-ui/core/Box'

const style = {
    heading: {
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "35px",
        lineHeight: "41px",
        letterSpacing: "-0.19px",
        color: "#000000",
        opacity: "0.15"
    }
}
export default function BlankPage({ heading, subheading }) {
    return (
        <Box alignItems="center" justifyContent="center" display="flex" height="20vh">
            <Box p={6} >

                <Box 
                    style={style.heading}
                    textAlign="center"
                >
                    {heading}
                </Box>
                <Box pt={2} textAlign="center">
                    {subheading}
                </Box>
            </Box>
        </Box>
    )
}
