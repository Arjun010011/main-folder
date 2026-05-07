export function getPreviewUrl(response) {
    return {
        type: 'PREVIEW_URL',
        payload: {
            data: response
        }
    }
}