import React from 'react'
import { ReactTransliterate, getTransliterateSuggestions } from "react-transliterate";
import "react-transliterate/dist/index.css";
import { Button, Grid, FormControl, MenuItem, Select, } from '@material-ui/core'
import { languageList } from 'Constants';
import { getKeyValueMap } from 'Includes/functions';


export default function ReactTranslatorField(props) {
    const { value, name, onChange, languageList} = props;
    const [textValue, set_textValue] = React.useState(value);
    const [selected_lang, set_selected_lang] = React.useState('en');
    const [language_list, set_language_list] = React.useState([]);
    const [language_key, set_language_key] = React.useState([]);


    const setFieldValue = (text) => {
        set_textValue(() => text)
    }

    React.useEffect(() => {
        let branchKeyValue = getKeyValueMap(languageList, 'code', 'name')
        set_language_key(() => branchKeyValue)
        set_language_list(() => languageList)
        props.onChangeLang('en','English')
    }, [])

    const handleChange = () => {
        onChange(textValue)
        set_textValue(() => '')
    }

    const handleDropDown = (e) => {
        set_textValue(() => '')
        set_selected_lang(e.target.value)
        props.onChangeLang(e.target.value,language_key[e.target.value])
    }

    return (
        <div>
            <Grid container spacing={2}>
                <Grid item md={3} xs={2}>
                    <FormControl>
                        <Select name='selected_lang'
                            className='apply-leave-drop-down-Style'
                            value={selected_lang}
                            required={true}
                            onChange={(e) => handleDropDown(e)}>
                            {language_list.map((temp) => {
                                return <MenuItem
                                    key={temp.id} value={temp.code}>{temp.name}
                                </MenuItem>
                            })}
                        </Select>
                    </FormControl>
                </Grid>
                {selected_lang !== 'en' &&
                    <>
                        <Grid item md={6} xs={10}>
                            <ReactTransliterate
                                renderComponent={(props) => <textarea {...props}
                                    style={{
                                        minHeight: '100px', height: '100px', maxHeight: '400px', minWidth: '100%', width: '50%', position: 'initial',
                                        maxWidth: '100%'
                                    }} />}
                                onChangeText={(text) => setFieldValue(text)}
                                // onBlur={()=>onBlur}
                                lang={selected_lang}
                                // {...field}
                                name={name}
                                value={textValue}
                            />
                        </Grid>
                        <Grid item md={2} xs={2}>
                            <Button
                                onClick={handleChange}
                                className='custom-button'
                            >Insert value
                            </Button>
                        </Grid>
                    </>
                }
            </Grid>
        </div>
    )
}



