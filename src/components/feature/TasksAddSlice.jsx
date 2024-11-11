import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from '../../config/firebaseConfig'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'



//all todoes of spacfic group
export const fetchTodosByGroup = createAsyncThunk('task/fetchTodosByGroup', async ({ userId, groupId }) => {
  const todosCol = collection(db, `users/${userId}/groups/${groupId}/todos`);
  const todosSnapshot = await getDocs(todosCol);
  const todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return { groupId, todos };
})

export const fetchGroups = createAsyncThunk('task/fetchGroup', async (userId) => {
  const groupCol = collection( db ,`users/${userId}/groups`)
  const groupSnapshot = await getDocs(groupCol)
  return groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
})

export const fetchUserTask = createAsyncThunk('task/fetchUserTask', async (userId) => {
  const userTaskCol = collection( db ,`users/${userId}/userTask`);
  const usertaskSnapshot = await getDocs(userTaskCol);
  return usertaskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
})

export const addUserTask = createAsyncThunk('task/addUserTask', async ({ groupId, userId, todo }) => {
  const addedDoc = { groupId: groupId, ...todo }
  const userTaskCol = collection( db ,`users/${userId}/userTask`);
  const addTask = await addDoc(userTaskCol, addedDoc)
  return { id: addTask.id, ...addedDoc }
})

export const addGroup = createAsyncThunk('task/addgroup', async ({ userId, group }) => {
  const groupcol = collection( db ,`users/${userId}/groups`)
  const groupRef = await addDoc(groupcol, group);
  return { id: groupRef.id, ...group }
})

export const addTodo = createAsyncThunk('task/addTodo', async ({ userId, groupId, todo } , {dispatch}) => {
  const todosCol = collection(db, `users/${userId}/groups/${groupId}/todos`);
  const docRef = await addDoc(todosCol, todo);
  await dispatch(addUserTask({ groupId, userId, todo }));
  return { groupId, id: docRef.id, ...todo }
})

export const deleteTodo = createAsyncThunk('task/deleteTodo', async ({ userId, todoId, groupId }) => {
  const todoRef = doc(db, `users/${userId}/groups/${groupId}/todos`, todoId);
  await deleteDoc(todoRef);
  return { todoId, groupId };
})

export const updateTodo = createAsyncThunk('task/updateTodo', async ({ userId, todoId, updatedTodo, groupId }) => {
  const todoRef = doc(db, `users/${userId}/groups/${groupId}/todos`, todoId);
  await updateDoc(todoRef, updatedTodo);
  return { todoId, updatedTodo, groupId };
})

const initialState = {
  groups: [],
  tasksByGroup: {},
  allTask: [],
  selectedGroupId: null,
  groupStatus: 'idle',
  allTaskStatus: 'idle',
  todosByGroupStatus: {},
  error: null,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setSelectedGroup(state, action) {
      state.selectedGroupId = action.payload;
    }
  },
  extraReducers: builder => {
    builder


      .addCase(fetchGroups.pending, (state) => {
        state.groupStatus = 'loading';
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groupStatus = 'succeeded';
        state.groups = action.payload;

        action.payload.forEach(group => {
          if (!state.todosByGroupStatus[group.id]) {
            state.todosByGroupStatus[group.id] = 'idle';
          }
        });
      })
      .addCase(fetchGroups.rejected, (state , action) => {
        state.groupStatus = 'failed';
          state.error = action.error.message || 'Failed to fetch groups';
      })


      .addCase(fetchTodosByGroup.pending ,( state  , action )=> state.todosByGroupStatus[action.meta.arg.groupId]= 'loading')
      .addCase(fetchTodosByGroup.fulfilled , (state , action) => {
             const {groupId , todos} = action.payload
         state.todosByGroupStatus[groupId] ='succeeded'
        
         state.tasksByGroup[groupId] = todos;
      })
      .addCase(fetchTodosByGroup.rejected , (state , action) => {
        state.todosByGroupStatus[action.meta.arg.groupId]= 'failed'
         state.error = action.error.message || 'something unexpected happen'
      })


      .addCase(fetchUserTask.pending, (state) => {
        state.allTaskStatus = 'loading'
      })
      .addCase(fetchUserTask.fulfilled, (state, action) => {
        state.allTaskStatus = 'succeeded'
        state.allTask = action.payload
      })

      .addCase(fetchUserTask.rejected, (state) => {
        state.allTaskStatus = 'failed'
      })
      .addCase(addTodo.fulfilled, (state, action) => {
        const { groupId, id, ...todo } = action.payload
        if (state.tasksByGroup[groupId]) {
          state.tasksByGroup[groupId].push({ id, ...todo })
        }
      })

      .addCase(deleteTodo.fulfilled, (state, action) => {
        const { groupId, todoId } = action.payload

        if (state.tasksByGroup[groupId]) {
          const index = state.tasksByGroup[groupId].findIndex(todo => todo.id === todoId)
          state.tasksByGroup[groupId].splice(index, 1);
        }
      })
      .addCase(updateTodo.fulfilled, (state, action) => {

        const { groupId, todoId, updatedTodo } = action.payload
        if (state.tasksByGroup[groupId]) {
          const index = state.tasksByGroup[groupId].findIndex(todo => todo.id === todoId)
          if (index !== -1) {
            state.tasksByGroup[groupId][index] = { ...state.tasksByGroup[groupId][index], ...updatedTodo }
          }
        }

      })
      .addCase(addGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
      })


      .addCase(addUserTask.fulfilled, (state, action) => {
        state.allTask.push(action.payload)
      })


  }
});

export const { setSelectedGroup } = taskSlice.actions
export const selectGroup = state => (state.toDo.groups)
export default taskSlice.reducer;