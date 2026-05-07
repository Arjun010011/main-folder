import React from 'react';
import { Radio, RadioGroup, FormControlLabel, FormControl, Button } from '@material-ui/core';


const DummyPayment = React.forwardRef((props, ref) => {

    const [radioValue, setRadioValue] = React.useState(true);
    const [propsDetail, setPropsDetail] = React.useState({});
    const [redirectUrl, setRedirectUrl] = React.useState({});

    React.useEffect(()=>{
        setPropsDetail(()=> props.location.state.detail)
        setRedirectUrl(()=> props.location.state.redirectUrl)
    },[])

    const handleChange = () => {
        let value = radioValue
        setRadioValue(() => !value)
    }

    const submit=()=>{
        props.history.push({
            pathname: redirectUrl,
            state: { detail: propsDetail, radioValue}
        })
    }

    return (
        <>
            <div style={{ textAlign: 'center' }}>Trasnaction going on</div>
            <div>
                <FormControl>
                    <RadioGroup value={radioValue} onChange={handleChange} row>
                        <FormControlLabel
                            value={true}
                            control={<Radio color="primary" />}
                            label={'Success'}
                            labelPlacement="end"
                        />
                        <FormControlLabel
                            value={false}
                            control={<Radio color="primary" />}
                            label={'Failure'}
                            labelPlacement="end"
                        />
                    </RadioGroup>
                </FormControl>
                <div>
                    <Button variant='contained'
                        color='primary' className='submit'
                        onClick={submit}>
                            Submit
                    </Button>
                </div>
            </div>
        </>
    )
})

export default DummyPayment