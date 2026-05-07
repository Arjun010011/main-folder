import React from 'react'

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
    toolbar: [
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
    ]
};

const formats = [
    'font',
    'size',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'align',
    'color', 'background'
];


export default function ReactTranslatorField(props) {
    const { value, theme = 'snow', onChange } = props;
    const [textValue, set_textValue] = React.useState(value);


    return (
        <ReactQuill
            ref={(el) => this.quillRef = el}
            theme={theme}
            value={value}
            readOnly={false}
            onChange={onChange}
            // onChangeSelection={this.onEditorChangeSelection}
            // onFocus={this.onEditorFocus}
            // onBlur={this.onEditorBlur}
            modules={modules}
            formats={formats}
        />
    )
}



