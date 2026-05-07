import { createSelector } from 'reselect';

const videotorial = (state) => state.get('videoTutorial');

const getVideotorialPreviewUrl = () => createSelector(
    videotorial,
  (previewUrlState) => previewUrlState.get('preview_url')
);

export {
    getVideotorialPreviewUrl,
    videotorial,
};
