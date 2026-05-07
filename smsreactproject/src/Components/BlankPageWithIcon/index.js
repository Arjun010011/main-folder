import React from 'react'
import { Paper, Box, FormLabel, Button } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';

import { BUTTONCOLOR } from './../../Constants/styleVariable';
import './styles.scss';

function BlankPagewithIcon({ icon = true, data, heights, button, fun, errorOutline }) {
  return (
    <Box>
      <Paper className='paper-plain-background' style={{lineHeight: '45vh'}}>
        <Box>
          <Box className='blank-data'>
            {errorOutline && <ErrorOutlineIcon className="error-icon" />}
            <Box style={{ fontWeight: "500", fontSize: "30px", fontStyle: "Roboto", display: "flex", alignItems: "center", lineHeight: '45px' }}>
              {data}
            </Box>
            {
              button &&
              <Box mt={3}>

                <Button color="primary" variant="contained" style={{ background: BUTTONCOLOR }}
                  onClick={fun}
                >
                  Add term
                    </Button>
              </Box>
            }
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default BlankPagewithIcon
