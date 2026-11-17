/**
 * Cantinho Certo — Persistência isolada das ferramentas
 */
(function(window) {
  'use strict';

  function getKey(toolKey) {
    return 'cc-tool:' + toolKey;
  }

  function read(toolKey) {
    try {
      var value = window.localStorage.getItem(getKey(toolKey));
      return {
        ok: true,
        value: value ? JSON.parse(value) : null
      };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  function write(toolKey, value) {
    try {
      window.localStorage.setItem(getKey(toolKey), JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  function remove(toolKey) {
    try {
      window.localStorage.removeItem(getKey(toolKey));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  window.CantinhoToolStorage = {
    read: read,
    write: write,
    remove: remove
  };
})(window);
