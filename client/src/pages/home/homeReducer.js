export const initialState = {
  isCompleted: false,
  messages: [],
  tasks: [],
  loading: false,
  error: null,
  statusMessage: "Analyzing query & intent...",
};

export function homeReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_COMPLETE":
      return {
        ...state,
        isCompleted: !state.isCompleted,
      };
    case "SEND_CHAT_START":
      return {
        ...state,
        loading: true,
        error: null,
        statusMessage: "Analyzing query & intent...",
      };
    case "SET_STATUS_MESSAGE":
      return {
        ...state,
        statusMessage: action.payload,
      };
    case "SEND_CHAT_SUCCESS":
      return {
        ...state,
        loading: false,
        messages: [...state.messages, action.payload],
      };
    case "SEND_CHAT_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case "FETCH_TASKS_START":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "FETCH_TASKS_SUCCESS":
      return {
        ...state,
        loading: false,
        tasks: action.payload,
      };
    case "FETCH_TASKS_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

export default homeReducer;
