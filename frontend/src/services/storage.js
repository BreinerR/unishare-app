/**
 * Adaptador de almacenamiento seguro para tokens y estado de sesión
 */
let memoryStore = {};

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

export const Storage = {
  async getItem(key) {
    if (AsyncStorage) {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        return memoryStore[key] || null;
      }
    }
    return memoryStore[key] || null;
  },

  async setItem(key, value) {
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        memoryStore[key] = value;
      }
    } else {
      memoryStore[key] = value;
    }
  },

  async removeItem(key) {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        delete memoryStore[key];
      }
    } else {
      delete memoryStore[key];
    }
  }
};

export default Storage;
