const NAVIGATION_STATE_KEY = 'piewallah_navigation_state';

export interface NavigationState {
  subjectName?: string;
  batchName?: string;
  subjectId?: string;
  topicName?: string;
  batchId?: string;
  subjectSlug?: string;
  topicId?: string;
}

export const saveNavigationState = (state: NavigationState) => {
  try {
    const currentState = getNavigationState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.error('Failed to save navigation state:', error);
  }
};

export const getNavigationState = (): NavigationState => {
  try {
    const state = localStorage.getItem(NAVIGATION_STATE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (error) {
    console.error('Failed to get navigation state:', error);
    return {};
  }
};

export const clearNavigationState = () => {
  try {
    localStorage.removeItem(NAVIGATION_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear navigation state:', error);
  }
};
