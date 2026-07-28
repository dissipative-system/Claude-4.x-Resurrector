// ==UserScript==
// @name         Claude 4.x Models Resurrector
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  Restore legacy Claude 4.x model rows through Claude's eager bootstrap, availability, and model selector state
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-start
// @author	 gpt-5.6-sol (via codex)
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT = '[Claude 4.5 Resurrector]';
    const STORAGE_KEY = 'claude45-resurrector-force-model';

    const MODEL_ROWS = {
        opus45: {
            model: 'claude-opus-4-5-20251101',
            name: 'Claude Opus 4.5',
            overflow: true,
            notice_text: 'Opus consumes usage limits faster than other models',
            paprika_modes: ['extended'],
            hard_limit: 190000,
            thinking_modes: [{
                description: 'Think longer for complex tasks',
                description_key: 'amber_river_echo',
                id: 'extended',
                is_default: false,
                mode: 'extended',
                paprika_mode_value: 'extended',
                selection_title: 'Extended',
                selection_title_key: 'crimson_peak_summit',
                title: 'Extended thinking',
                title_key: 'golden_forest_whisper'
            }]
        },
        sonnet45: {
            model: 'claude-sonnet-4-5-20250929',
            name: 'Claude Sonnet 4.5',
            overflow: true,
            paprika_modes: ['extended'],
            hard_limit: 190000,
            thinking_modes: [{
                description: 'Think longer for complex tasks',
                description_key: 'amber_river_echo',
                id: 'extended',
                is_default: false,
                mode: 'extended',
                paprika_mode_value: 'extended',
                selection_title: 'Extended',
                selection_title_key: 'crimson_peak_summit',
                title: 'Extended thinking',
                title_key: 'golden_forest_whisper'
            }]
        },
        opus41: {
            model: 'claude-opus-4-1-20250805-claude-ai',
            name: 'Claude Opus 4.1',
            overflow: true,
            notice_text: 'Opus consumes usage limits faster than other models',
            paprika_modes: ['extended'],
            hard_limit: 190000,
            thinking_modes: [{
                description: 'Think longer for complex tasks',
                description_key: 'amber_river_echo',
                id: 'extended',
                is_default: false,
                mode: 'extended',
                paprika_mode_value: 'extended',
                selection_title: 'Extended',
                selection_title_key: 'crimson_peak_summit',
                title: 'Extended thinking',
                title_key: 'golden_forest_whisper'
            }]
        },
        sonnet4: {
            model: 'claude-sonnet-4-20250514',
            name: 'Claude Sonnet 4',
            overflow: true,
            paprika_modes: ['extended'],
            hard_limit: 190000,
            thinking_modes: [{
                description: 'Think longer for complex tasks',
                description_key: 'amber_river_echo',
                id: 'extended',
                is_default: false,
                mode: 'extended',
                paprika_mode_value: 'extended',
                selection_title: 'Extended',
                selection_title_key: 'crimson_peak_summit',
                title: 'Extended thinking',
                title_key: 'golden_forest_whisper'
            }]
        }
    };

    const MODEL_IDS = new Set(Object.values(MODEL_ROWS).map(row => row.model));
    const MODEL_ALIASES = {
        'claude-opus-4-1-20250805': MODEL_ROWS.opus41.model
    };
    const SELECTOR_MODEL_ROWS = {
        [MODEL_ROWS.opus45.model]: {
            id: MODEL_ROWS.opus45.model,
            name: 'Opus 4.5',
            notice_text: 'Opus consumes usage limits faster than other models',
            section: 'overflow',
            capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true
            },
            thinking: {
                type: 'effort_and_mode',
                description: 'Higher effort means more thorough responses, but takes longer and uses your limits faster.',
                effort_options: [
                    { id: 'low', name: 'Low', description: 'Quick replies to simple questions' },
                    { id: 'medium', name: 'Medium', description: 'Balanced for everyday work' },
                    {
                        id: 'high',
                        name: 'High',
                        description: 'Complex, detailed work',
                        recommended: true,
                        badge: { message: 'Default', variant: 'neutral' }
                    }
                ],
                mode_options: [
                    { id: 'extended', name: 'Extended', description: 'Always uses deep reasoning' },
                    { id: 'off', name: 'Off' }
                ]
            },
            hard_limit: 190000
        },
        [MODEL_ROWS.sonnet45.model]: {
            id: MODEL_ROWS.sonnet45.model,
            name: 'Sonnet 4.5',
            description: 'Previous responsive everyday work',
            section: 'overflow',
            capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true
            },
            thinking: {
                type: 'mode',
                mode_options: [
                    { id: 'extended', name: 'Extended', description: 'Always uses deep reasoning' },
                    { id: 'off', name: 'Off' }
                ]
            },
            hard_limit: 190000
        },
        [MODEL_ROWS.opus41.model]: {
            id: MODEL_ROWS.opus41.model,
            name: 'Opus 4.1',
            notice_text: 'Opus consumes usage limits faster than other models',
            section: 'overflow',
            capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true
            },
            thinking: {
                type: 'mode',
                mode_options: [
                    { id: 'extended', name: 'Extended', description: 'Always uses deep reasoning' },
                    { id: 'off', name: 'Off' }
                ]
            },
            hard_limit: 190000
        },
        [MODEL_ROWS.sonnet4.model]: {
            id: MODEL_ROWS.sonnet4.model,
            name: 'Sonnet 4',
            section: 'overflow',
            capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true
            },
            thinking: {
                type: 'mode',
                mode_options: [
                    { id: 'extended', name: 'Extended', description: 'Always uses deep reasoning' },
                    { id: 'off', name: 'Off' }
                ]
            },
            hard_limit: 190000
        }
    };
    const DEFAULT_SELECTOR_THINKING = {
        [MODEL_ROWS.opus45.model]: { type: 'effort_and_mode', effort: 'high', mode: 'off' },
        [MODEL_ROWS.sonnet45.model]: { type: 'mode', mode: 'extended' },
        [MODEL_ROWS.opus41.model]: { type: 'mode', mode: 'extended' },
        [MODEL_ROWS.sonnet4.model]: { type: 'mode', mode: 'extended' }
    };
    const AVAILABLE_MODEL_ROWS = {
        [MODEL_ROWS.opus45.model]: {
            model_id: MODEL_ROWS.opus45.model,
            minimum_tier: 'pro'
        },
        [MODEL_ROWS.sonnet45.model]: {
            model_id: MODEL_ROWS.sonnet45.model,
            minimum_tier: 'free'
        },
        [MODEL_ROWS.opus41.model]: {
            model_id: MODEL_ROWS.opus41.model,
            minimum_tier: 'pro'
        },
        [MODEL_ROWS.sonnet4.model]: {
            model_id: MODEL_ROWS.sonnet4.model,
            minimum_tier: 'free'
        }
    };
    const MODEL_CONFIGS = {
        [MODEL_ROWS.opus45.model]: {
            api_model: MODEL_ROWS.opus45.model,
            image_in: true,
            pdf_in: true,
            max_tokens_cap: 128000
        },
        [MODEL_ROWS.sonnet45.model]: {
            api_model: MODEL_ROWS.sonnet45.model,
            image_in: true,
            pdf_in: true,
            max_tokens_cap: 128000
        },
        [MODEL_ROWS.opus41.model]: {
            api_model: MODEL_ROWS.opus41.model,
            image_in: true,
            pdf_in: true,
            max_tokens_cap: 128000
        },
        [MODEL_ROWS.sonnet4.model]: {
            api_model: MODEL_ROWS.sonnet4.model,
            image_in: true,
            pdf_in: true,
            max_tokens_cap: 128000
        }
    };

    const state = {
        eagerBootstrapPatches: 0,
        bootstrapPatches: 0,
        cachePatches: 0,
        availableModelPatches: 0,
        modelConfigPatches: 0,
        selectorConfigPatches: 0,
        selectorStatePatches: 0,
        requestPatches: 0,
        lastModelList: [],
        lastAvailableModels: [],
        lastSelectorModel: null,
        lastCompletionModel: null,
        lastDefaultModel: null,
        forceModel: normalizeModelId(readStoredForceModel())
    };
    const pendingSelectorModels = new Map();
    const patchedBootstrapPromises = new WeakMap();
    const patchedResponses = new WeakSet();

    installBootstrapPreloadHook();
    installPreloadedCacheHooks();
    patchPreloadedCaches();
    scheduleCachePatches();

    const originalFetch = window.fetch;
    if (typeof originalFetch !== 'function') {
        console.warn(SCRIPT, 'window.fetch is unavailable at document-start');
        return;
    }

    window.fetch = async function claude45Fetch(input, init) {
        const requestInfo = await patchOutgoingRequest(input, init);
        const response = await originalFetch.call(this, requestInfo.input, requestInfo.init);
        return patchIncomingResponse(requestInfo.url, requestInfo.method, response);
    };

    window.Claude45Resurrector = {
        models: Object.fromEntries(Object.entries(MODEL_ROWS).map(([key, row]) => [key, row.model])),
        status() {
            return { ...state };
        },
        force(model) {
            const modelId = normalizeModelId(model);
            if (!modelId) {
                throw new Error('Use "opus45", "sonnet45", "opus41", "sonnet4", or a known restored Claude model id.');
            }
            state.forceModel = modelId;
            writeStoredForceModel(modelId);
            console.info(SCRIPT, 'Force model enabled:', modelId);
            return { ...state };
        },
        clearForce() {
            state.forceModel = null;
            clearStoredForceModel();
            console.info(SCRIPT, 'Force model cleared');
            return { ...state };
        }
    };

    console.info(SCRIPT, 'v5.5 loaded. Eager bootstrap, availability, selector-state, and preloaded-cache patches are active.');

    async function patchOutgoingRequest(input, init) {
        const url = getUrl(input);
        const method = getMethod(input, init);
        if (!url || !isClaudeApiUrl(url)) {
            return { input, init, url, method };
        }

        const bodyText = await getBodyText(input, init);
        if (!bodyText || !looksLikeJson(bodyText)) {
            return { input, init, url, method };
        }

        let body;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return { input, init, url, method };
        }

        const before = JSON.stringify(body);

        if (isAccountSettingsUrl(url) && typeof body.default_model === 'string') {
            state.lastDefaultModel = body.default_model;
            if (state.forceModel) {
                body.default_model = state.forceModel;
            }
        }

        const selectorStateId = getModelSelectorStateId(url);
        if (selectorStateId && typeof body.model === 'string') {
            const originalModel = body.model;
            const selected = firstModelId(body.model, state.forceModel);
            if (selected) {
                body.model = selected;
                applySelectorThinking(body, selected, originalModel !== selected);
                pendingSelectorModels.set(selectorStateKey(url), selected);
                state.lastSelectorModel = selected;
            }
        }

        if (isCompletionUrl(url)) {
            const selected = firstModelId(body.model, body.create_conversation_params?.model, state.forceModel);
            if (selected) {
                body.model = selected;
                if (body.create_conversation_params && typeof body.create_conversation_params === 'object') {
                    body.create_conversation_params.model = selected;
                }
                applyCompletionThinking(body, selected);
                state.lastCompletionModel = selected;
            }
        }

        const after = JSON.stringify(body);
        if (after === before) {
            return { input, init, url, method };
        }

        state.requestPatches += 1;
        return withBody(input, init, after, bodyText);
    }

    async function patchIncomingResponse(url, method, response) {
        if (!url || !isClaudeApiUrl(url)) {
            return response;
        }
        if (response && typeof response === 'object' && patchedResponses.has(response)) {
            return response;
        }

        if (method === 'GET' && isBootstrapUrl(url)) {
            return patchJsonResponse(response, json => {
                const patched = patchBootstrapPayload(json);
                if (patched.total > 0) {
                    state.bootstrapPatches += patched.modelLists;
                    state.availableModelPatches += patched.availableModels;
                    state.selectorConfigPatches += patched.selectorConfigs;
                    state.selectorStatePatches += patched.selectorStates;
                    console.info(SCRIPT, 'Patched bootstrap payload:', patched);
                    logModelList();
                    logSelectorList();
                }
            });
        }

        const selectorStateId = getModelSelectorStateId(url);
        if (method === 'PATCH' && selectorStateId) {
            const selected = pendingSelectorModels.get(selectorStateKey(url)) || state.forceModel;
            if (!response.ok && selected) {
                state.selectorStatePatches += 1;
                console.info(SCRIPT, 'Provided model selector state fallback:', selectorStateId, selected);
                return jsonResponse(buildSelectorState(selectorStateId, selected), response);
            }
            return patchJsonResponse(response, json => {
                const patched = patchModelSelectorState(json, selected);
                if (patched > 0) {
                    state.selectorStatePatches += patched;
                }
            });
        }

        const modelConfigId = getModelConfigId(url);
        if (method === 'GET' && modelConfigId && MODEL_CONFIGS[modelConfigId]) {
            if (!response.ok) {
                state.modelConfigPatches += 1;
                console.info(SCRIPT, 'Provided client model_config fallback:', modelConfigId);
                return jsonResponse(MODEL_CONFIGS[modelConfigId], response);
            }
            return patchJsonResponse(response, json => {
                Object.assign(json, MODEL_CONFIGS[modelConfigId]);
                state.modelConfigPatches += 1;
            });
        }

        return response;
    }

    function patchBootstrapPayload(root) {
        const patched = {
            modelLists: 0,
            availableModels: 0,
            selectorConfigs: 0,
            selectorStates: 0,
            get total() {
                return this.modelLists + this.availableModels + this.selectorConfigs + this.selectorStates;
            }
        };
        const seen = new WeakSet();

        function visit(value) {
            if (!value || typeof value !== 'object') {
                return;
            }
            if (seen.has(value)) {
                return;
            }
            seen.add(value);

            if (Array.isArray(value.claude_ai_bootstrap_models_config)) {
                patchModelList(value.claude_ai_bootstrap_models_config);
                patched.modelLists += 1;
            }

            patched.availableModels += patchAvailableModels(value);
            patched.selectorConfigs += patchModelSelectorConfig(value);
            patched.selectorStates += patchModelSelectorState(value);

            if (Array.isArray(value)) {
                for (const item of value) visit(item);
                return;
            }

            for (const key of Object.keys(value)) {
                visit(value[key]);
            }
        }

        visit(root);
        return patched;
    }

    function patchModelList(list) {
        for (const template of Object.values(MODEL_ROWS)) {
            const existing = list.find(row => row && row.model === template.model);
            if (existing) {
                Object.assign(existing, clone(template));
                delete existing.inactive;
                continue;
            }
            const row = clone(template);
            delete row.inactive;
            list.push(row);
        }
        state.lastModelList = list.map(row => ({
            model: row.model,
            name: row.name,
            inactive: Boolean(row.inactive),
            overflow: Boolean(row.overflow)
        }));
    }

    function patchAvailableModels(value) {
        if (!value || typeof value !== 'object' || !Array.isArray(value.models)) {
            return 0;
        }
        if (!value.models.some(row => row && typeof row.model_id === 'string' && row.model_id.startsWith('claude-'))) {
            return 0;
        }

        for (const template of Object.values(AVAILABLE_MODEL_ROWS)) {
            const existing = value.models.find(row => row && row.model_id === template.model_id);
            if (existing) {
                Object.assign(existing, clone(template));
                continue;
            }
            value.models.push(clone(template));
        }

        state.lastAvailableModels = value.models.map(row => ({
            model_id: row.model_id,
            minimum_tier: row.minimum_tier
        }));
        return 1;
    }

    function patchModelSelectorConfig(config) {
        if (!config || typeof config !== 'object' || !Array.isArray(config.models)) {
            return 0;
        }
        if (!config.models.some(row => row && typeof row.id === 'string' && row.id.startsWith('claude-'))) {
            return 0;
        }
        if (!shouldPatchSelector(config.id, config.models)) {
            return 0;
        }

        for (const template of Object.values(SELECTOR_MODEL_ROWS)) {
            const existing = config.models.find(row => row && row.id === template.id);
            if (existing) {
                Object.assign(existing, clone(template));
                delete existing.disabled;
                delete existing.disabled_reason;
                delete existing.inactive;
                delete existing.deprecated;
                continue;
            }
            config.models.push(clone(template));
        }

        return 1;
    }

    function patchModelSelectorState(selectorState, selectedModel) {
        if (!selectorState || typeof selectorState !== 'object') {
            return 0;
        }
        if (!Array.isArray(selectorState.thinking_by_model)) {
            return 0;
        }
        if (!selectorState.thinking_by_model.some(row => row && typeof row.id === 'string' && row.id.startsWith('claude-'))) {
            return 0;
        }
        if (!shouldPatchSelector(selectorState.id, selectorState.thinking_by_model, selectedModel)) {
            return 0;
        }

        for (const [modelId, thinking] of Object.entries(DEFAULT_SELECTOR_THINKING)) {
            const existing = selectorState.thinking_by_model.find(row => row && row.id === modelId);
            if (existing) {
                existing.thinking = clone(thinking);
                continue;
            }
            selectorState.thinking_by_model.push({
                id: modelId,
                thinking: clone(thinking)
            });
        }

        const selected = normalizeModelId(selectedModel);
        if (selected) {
            selectorState.model = selected;
            selectorState.thinking = clone(DEFAULT_SELECTOR_THINKING[selected]);
            selectorState.selection_source = 'user_setting';
        }

        return 1;
    }

    function shouldPatchSelector(selectorId, rows, selectedModel) {
        if (selectorId === 'chat') {
            return true;
        }
        if (normalizeModelId(selectedModel)) {
            return true;
        }
        return Array.isArray(rows) && rows.some(row => row && normalizeModelId(row.id));
    }

    function installBootstrapPreloadHook() {
        hookGlobalValue('__BOOTSTRAP_PRELOAD__', value => {
            return transformBootstrapPreload(value);
        });
    }

    function transformBootstrapPreload(value) {
        if (!value || typeof value !== 'object') {
            return value;
        }

        const promise = value.promise;
        if (!promise || typeof promise.then !== 'function') {
            return value;
        }

        const alreadyPatched = patchedBootstrapPromises.get(promise);
        if (alreadyPatched) {
            value.promise = alreadyPatched;
            return value;
        }

        const preloadUrl = typeof value.path === 'string' ? value.path : '';
        const patchedPromise = promise.then(response => {
            const responseUrl = preloadUrl || response?.url || '';
            if (!isBootstrapUrl(responseUrl)) {
                return response;
            }
            state.eagerBootstrapPatches += 1;
            return patchIncomingResponse(responseUrl, 'GET', response);
        });

        patchedBootstrapPromises.set(promise, patchedPromise);
        patchedBootstrapPromises.set(patchedPromise, patchedPromise);
        value.promise = patchedPromise;
        return value;
    }

    function installPreloadedCacheHooks() {
        hookGlobalValue('__PRELOADED_IDB_CACHE_RESULT__', value => {
            return transformCacheValue(value);
        });

        hookGlobalValue('__PRELOADED_IDB_CACHE__', value => {
            if (value && typeof value.then === 'function') {
                return value.then(result => {
                    return transformCacheValue(result);
                });
            }
            return transformCacheValue(value);
        });
    }

    function hookGlobalValue(name, transform) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(window, name);
            if (descriptor && descriptor.configurable === false) {
                if ('value' in descriptor) transform(descriptor.value);
                return;
            }

            let current = descriptor && 'value' in descriptor ? descriptor.value : window[name];
            if (current !== undefined) {
                current = transform(current);
            }

            Object.defineProperty(window, name, {
                configurable: true,
                enumerable: true,
                get() {
                    return current;
                },
                set(value) {
                    current = transform(value);
                }
            });
        } catch (error) {
            console.debug(SCRIPT, 'Could not hook', name, error);
        }
    }

    function patchPreloadedCaches() {
        try {
            if (window.__PRELOADED_IDB_CACHE_RESULT__ !== undefined) {
                window.__PRELOADED_IDB_CACHE_RESULT__ = transformCacheValue(window.__PRELOADED_IDB_CACHE_RESULT__);
            }
            const cachePromise = window.__PRELOADED_IDB_CACHE__;
            if (cachePromise && typeof cachePromise.then === 'function') {
                cachePromise.then(value => transformCacheValue(value)).catch(() => {});
            } else {
                transformCacheValue(cachePromise);
            }
        } catch (error) {
            console.debug(SCRIPT, 'Could not patch preloaded cache', error);
        }
    }

    function scheduleCachePatches() {
        const start = Date.now();
        const interval = setInterval(() => {
            patchPreloadedCaches();
            if (Date.now() - start > 10000 || state.bootstrapPatches > 0 || state.availableModelPatches > 0) {
                clearInterval(interval);
            }
        }, 250);
    }

    function transformCacheValue(value) {
        if (!value) {
            return value;
        }

        if (typeof value === 'string' && looksLikeJson(value)) {
            try {
                const parsed = JSON.parse(value);
                const patched = patchBootstrapPayload(parsed);
                if (patched.total > 0) {
                    state.cachePatches += patched.total;
                    state.availableModelPatches += patched.availableModels;
                    state.selectorConfigPatches += patched.selectorConfigs;
                    state.selectorStatePatches += patched.selectorStates;
                    console.info(SCRIPT, 'Patched string cache payload:', patched);
                    logModelList();
                    logSelectorList();
                    return JSON.stringify(parsed);
                }
                return value;
            } catch {
                return value;
            }
        }

        if (typeof value === 'object') {
            const patched = patchBootstrapPayload(value);
            if (patched.total > 0) {
                state.cachePatches += patched.total;
                state.availableModelPatches += patched.availableModels;
                state.selectorConfigPatches += patched.selectorConfigs;
                state.selectorStatePatches += patched.selectorStates;
                console.info(SCRIPT, 'Patched object cache payload:', patched);
                logModelList();
                logSelectorList();
            }
            return value;
        }

        return value;
    }

    function logModelList() {
        const rows = state.lastModelList.filter(row => MODEL_IDS.has(row.model));
        if (rows.length) {
            console.table(rows);
        }
    }

    function logSelectorList() {
        if (state.lastSelectorModel) {
            console.info(SCRIPT, 'Last selector model:', state.lastSelectorModel);
        }
    }

    function applySelectorThinking(body, modelId, replace) {
        const thinking = DEFAULT_SELECTOR_THINKING[modelId];
        if (!thinking) {
            return;
        }
        if (replace || !body.thinking || typeof body.thinking !== 'object' || body.thinking.type !== thinking.type) {
            body.thinking = clone(thinking);
            return;
        }

        normalizeThinkingSelection(body.thinking, modelId);
    }

    function normalizeThinkingSelection(selection, modelId) {
        const fallback = DEFAULT_SELECTOR_THINKING[modelId];
        const spec = SELECTOR_MODEL_ROWS[modelId]?.thinking;
        if (!fallback || !spec || !selection || typeof selection !== 'object') {
            return;
        }

        selection.type = fallback.type;
        if (fallback.type === 'effort_and_mode') {
            if (!hasOption(spec.effort_options, selection.effort)) {
                selection.effort = fallback.effort;
            }
            if (!hasOption(spec.mode_options, selection.mode)) {
                selection.mode = fallback.mode;
            }
            return;
        }

        if (fallback.type === 'mode') {
            delete selection.effort;
            if (!hasOption(spec.mode_options, selection.mode)) {
                selection.mode = fallback.mode;
            }
        }
    }

    function applyCompletionThinking(body, modelId) {
        const thinking = DEFAULT_SELECTOR_THINKING[modelId];
        if (!thinking) {
            return;
        }

        body.effort = null;
        if (!isLegacyThinkingMode(body.thinking_mode)) {
            body.thinking_mode = thinking.mode || 'off';
        }
    }

    function isLegacyThinkingMode(value) {
        return value === 'extended' || value === 'off';
    }

    function hasOption(options, id) {
        return Array.isArray(options) && options.some(option => option && option.id === id);
    }

    function buildSelectorState(selectorStateId, modelId) {
        const selected = normalizeModelId(modelId);
        const thinking = selected ? DEFAULT_SELECTOR_THINKING[selected] : null;
        const payload = {
            id: selectorStateId,
            model: selected,
            thinking: thinking ? clone(thinking) : undefined,
            thinking_by_model: Object.entries(DEFAULT_SELECTOR_THINKING).map(([id, value]) => ({
                id,
                thinking: clone(value)
            })),
            selection_source: 'user_setting'
        };
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) delete payload[key];
        });
        return payload;
    }

    async function patchJsonResponse(response, mutator) {
        const text = await response.clone().text();
        if (!looksLikeJson(text)) {
            return response;
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            return response;
        }

        mutator(json);
        return jsonResponse(json, response);
    }

    function jsonResponse(json, response) {
        const headers = new Headers(response.headers);
        headers.set('content-type', 'application/json');
        headers.delete('content-length');
        headers.delete('content-encoding');
        const patchedResponse = new Response(JSON.stringify(json), {
            status: response.ok ? response.status : 200,
            statusText: response.ok ? response.statusText : 'OK',
            headers
        });
        patchedResponses.add(patchedResponse);
        return patchedResponse;
    }

    function getUrl(input) {
        if (typeof input === 'string') return input;
        if (input instanceof URL) return input.href;
        if (input instanceof Request) return input.url;
        return String(input || '');
    }

    function getMethod(input, init) {
        return String(init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
    }

    async function getBodyText(input, init) {
        if (init && typeof init.body === 'string') {
            return init.body;
        }
        if (input instanceof Request && input.method !== 'GET' && input.method !== 'HEAD') {
            try {
                return await input.clone().text();
            } catch {
                return null;
            }
        }
        return null;
    }

    function withBody(input, init, newBody, oldBody) {
        if (init && typeof init.body === 'string') {
            return { input, init: { ...init, body: newBody }, url: getUrl(input), method: getMethod(input, init) };
        }
        if (input instanceof Request && oldBody != null) {
            return {
                input: new Request(input, { body: newBody }),
                init,
                url: input.url,
                method: input.method
            };
        }
        return { input, init, url: getUrl(input), method: getMethod(input, init) };
    }

    function isClaudeApiUrl(url) {
        try {
            const parsed = new URL(url, location.href);
            return parsed.hostname === 'claude.ai';
        } catch {
            return false;
        }
    }

    function isBootstrapUrl(url) {
        const parsed = new URL(url, location.href);
        return /^\/edge-api\/bootstrap\/[^/]+\/app_start$/.test(parsed.pathname);
    }

    function isAccountSettingsUrl(url) {
        const parsed = new URL(url, location.href);
        return parsed.pathname === '/api/account/settings';
    }

    function getModelSelectorStateId(url) {
        const parsed = new URL(url, location.href);
        const match = parsed.pathname.match(/^\/api\/organizations\/[^/]+\/model_selector_state\/([^/]+)$/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    function selectorStateKey(url) {
        const parsed = new URL(url, location.href);
        return parsed.pathname;
    }

    function isCompletionUrl(url) {
        const parsed = new URL(url, location.href);
        return /^\/api\/organizations\/[^/]+\/chat_conversations\/[^/]+\/(completion|retry_completion|completion2|retry_completion2)$/.test(parsed.pathname);
    }

    function getModelConfigId(url) {
        const parsed = new URL(url, location.href);
        const match = parsed.pathname.match(/^\/api\/organizations\/[^/]+\/model_configs\/([^/]+)$/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    function firstModelId(...values) {
        for (const value of values) {
            const modelId = normalizeModelId(value);
            if (modelId) return modelId;
        }
        return null;
    }

    function normalizeModelId(value) {
        if (!value || typeof value !== 'string') return null;
        if (MODEL_ROWS[value]) return MODEL_ROWS[value].model;
        if (MODEL_ALIASES[value]) return MODEL_ALIASES[value];
        return MODEL_IDS.has(value) ? value : null;
    }

    function readStoredForceModel() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
    }

    function writeStoredForceModel(modelId) {
        try {
            localStorage.setItem(STORAGE_KEY, modelId);
        } catch {
            // Storage can be unavailable in stricter browser modes; the in-memory
            // setting still works for the current page load.
        }
    }

    function clearStoredForceModel() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Same as above: storage persistence is best-effort only.
        }
    }

    function looksLikeJson(text) {
        if (typeof text !== 'string') return false;
        const trimmed = text.trim();
        return trimmed.startsWith('{') || trimmed.startsWith('[');
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }
})();
