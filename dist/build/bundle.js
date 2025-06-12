
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function init_binding_group(group) {
        let _inputs;
        return {
            /* push */ p(...inputs) {
                _inputs = inputs;
                _inputs.forEach(input => group.push(input));
            },
            /* remove */ r() {
                _inputs.forEach(input => group.splice(group.indexOf(input), 1));
            }
        };
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function t$1(t,e,i,s){return new(i||(i=Promise))((function(n,r){function o(t){try{h(s.next(t));}catch(t){r(t);}}function a(t){try{h(s.throw(t));}catch(t){r(t);}}function h(t){var e;t.done?n(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(o,a);}h((s=s.apply(t,e||[])).next());}))}"function"==typeof SuppressedError&&SuppressedError;let e$1 = class e{constructor(){this.listeners={};}on(t,e,i){if(this.listeners[t]||(this.listeners[t]=new Set),this.listeners[t].add(e),null==i?void 0:i.once){const i=()=>{this.un(t,i),this.un(t,e);};return this.on(t,i),i}return ()=>this.un(t,e)}un(t,e){var i;null===(i=this.listeners[t])||void 0===i||i.delete(e);}once(t,e){return this.on(t,e,{once:!0})}unAll(){this.listeners={};}emit(t,...e){this.listeners[t]&&this.listeners[t].forEach((t=>t(...e)));}};const i$1={decode:function(e,i){return t$1(this,void 0,void 0,(function*(){const t=new AudioContext({sampleRate:i});return t.decodeAudioData(e).finally((()=>t.close()))}))},createBuffer:function(t,e){return "number"==typeof t[0]&&(t=[t]),function(t){const e=t[0];if(e.some((t=>t>1||t<-1))){const i=e.length;let s=0;for(let t=0;t<i;t++){const i=Math.abs(e[t]);i>s&&(s=i);}for(const e of t)for(let t=0;t<i;t++)e[t]/=s;}}(t),{duration:e,length:t[0].length,sampleRate:t[0].length/e,numberOfChannels:t.length,getChannelData:e=>null==t?void 0:t[e],copyFromChannel:AudioBuffer.prototype.copyFromChannel,copyToChannel:AudioBuffer.prototype.copyToChannel}}};function s$1(t,e){const i=e.xmlns?document.createElementNS(e.xmlns,t):document.createElement(t);for(const[t,n]of Object.entries(e))if("children"===t)for(const[t,n]of Object.entries(e))"string"==typeof n?i.appendChild(document.createTextNode(n)):i.appendChild(s$1(t,n));else "style"===t?Object.assign(i.style,n):"textContent"===t?i.textContent=n:i.setAttribute(t,n.toString());return i}function n$1(t,e,i){const n=s$1(t,e||{});return null==i||i.appendChild(n),n}var r$1=Object.freeze({__proto__:null,createElement:n$1,default:n$1});const o$1={fetchBlob:function(e,i,s){return t$1(this,void 0,void 0,(function*(){const n=yield fetch(e,s);if(n.status>=400)throw new Error(`Failed to fetch ${e}: ${n.status} (${n.statusText})`);return function(e,i){t$1(this,void 0,void 0,(function*(){if(!e.body||!e.headers)return;const s=e.body.getReader(),n=Number(e.headers.get("Content-Length"))||0;let r=0;const o=e=>t$1(this,void 0,void 0,(function*(){r+=(null==e?void 0:e.length)||0;const t=Math.round(r/n*100);i(t);})),a=()=>t$1(this,void 0,void 0,(function*(){let t;try{t=yield s.read();}catch(t){return}t.done||(o(t.value),yield a());}));a();}));}(n.clone(),i),n.blob()}))}};class a extends e$1{constructor(t){super(),this.isExternalMedia=!1,t.media?(this.media=t.media,this.isExternalMedia=!0):this.media=document.createElement("audio"),t.mediaControls&&(this.media.controls=!0),t.autoplay&&(this.media.autoplay=!0),null!=t.playbackRate&&this.onMediaEvent("canplay",(()=>{null!=t.playbackRate&&(this.media.playbackRate=t.playbackRate);}),{once:!0});}onMediaEvent(t,e,i){return this.media.addEventListener(t,e,i),()=>this.media.removeEventListener(t,e,i)}getSrc(){return this.media.currentSrc||this.media.src||""}revokeSrc(){const t=this.getSrc();t.startsWith("blob:")&&URL.revokeObjectURL(t);}canPlayType(t){return ""!==this.media.canPlayType(t)}setSrc(t,e){const i=this.getSrc();if(t&&i===t)return;this.revokeSrc();const s=e instanceof Blob&&(this.canPlayType(e.type)||!t)?URL.createObjectURL(e):t;i&&(this.media.src="");try{this.media.src=s;}catch(e){this.media.src=t;}}destroy(){this.isExternalMedia||(this.media.pause(),this.media.remove(),this.revokeSrc(),this.media.src="",this.media.load());}setMediaElement(t){this.media=t;}play(){return t$1(this,void 0,void 0,(function*(){return this.media.play()}))}pause(){this.media.pause();}isPlaying(){return !this.media.paused&&!this.media.ended}setTime(t){this.media.currentTime=Math.max(0,Math.min(t,this.getDuration()));}getDuration(){return this.media.duration}getCurrentTime(){return this.media.currentTime}getVolume(){return this.media.volume}setVolume(t){this.media.volume=t;}getMuted(){return this.media.muted}setMuted(t){this.media.muted=t;}getPlaybackRate(){return this.media.playbackRate}isSeeking(){return this.media.seeking}setPlaybackRate(t,e){null!=e&&(this.media.preservesPitch=e),this.media.playbackRate=t;}getMediaElement(){return this.media}setSinkId(t){return this.media.setSinkId(t)}}class h extends e$1{constructor(t,e){super(),this.timeouts=[],this.isScrollable=!1,this.audioData=null,this.resizeObserver=null,this.lastContainerWidth=0,this.isDragging=!1,this.subscriptions=[],this.unsubscribeOnScroll=[],this.subscriptions=[],this.options=t;const i=this.parentFromOptionsContainer(t.container);this.parent=i;const[s,n]=this.initHtml();i.appendChild(s),this.container=s,this.scrollContainer=n.querySelector(".scroll"),this.wrapper=n.querySelector(".wrapper"),this.canvasWrapper=n.querySelector(".canvases"),this.progressWrapper=n.querySelector(".progress"),this.cursor=n.querySelector(".cursor"),e&&n.appendChild(e),this.initEvents();}parentFromOptionsContainer(t){let e;if("string"==typeof t?e=document.querySelector(t):t instanceof HTMLElement&&(e=t),!e)throw new Error("Container not found");return e}initEvents(){const t=t=>{const e=this.wrapper.getBoundingClientRect(),i=t.clientX-e.left,s=t.clientY-e.top;return [i/e.width,s/e.height]};if(this.wrapper.addEventListener("click",(e=>{const[i,s]=t(e);this.emit("click",i,s);})),this.wrapper.addEventListener("dblclick",(e=>{const[i,s]=t(e);this.emit("dblclick",i,s);})),!0!==this.options.dragToSeek&&"object"!=typeof this.options.dragToSeek||this.initDrag(),this.scrollContainer.addEventListener("scroll",(()=>{const{scrollLeft:t,scrollWidth:e,clientWidth:i}=this.scrollContainer,s=t/e,n=(t+i)/e;this.emit("scroll",s,n,t,t+i);})),"function"==typeof ResizeObserver){const t=this.createDelay(100);this.resizeObserver=new ResizeObserver((()=>{t().then((()=>this.onContainerResize())).catch((()=>{}));})),this.resizeObserver.observe(this.scrollContainer);}}onContainerResize(){const t=this.parent.clientWidth;t===this.lastContainerWidth&&"auto"!==this.options.height||(this.lastContainerWidth=t,this.reRender());}initDrag(){this.subscriptions.push(function(t,e,i,s,n=3,r=0,o=100){if(!t)return ()=>{};const a=matchMedia("(pointer: coarse)").matches;let h=()=>{};const l=l=>{if(l.button!==r)return;l.preventDefault(),l.stopPropagation();let d=l.clientX,c=l.clientY,u=!1;const p=Date.now(),m=s=>{if(s.preventDefault(),s.stopPropagation(),a&&Date.now()-p<o)return;const r=s.clientX,h=s.clientY,l=r-d,m=h-c;if(u||Math.abs(l)>n||Math.abs(m)>n){const s=t.getBoundingClientRect(),{left:n,top:o}=s;u||(null==i||i(d-n,c-o),u=!0),e(l,m,r-n,h-o),d=r,c=h;}},f=e=>{if(u){const i=e.clientX,n=e.clientY,r=t.getBoundingClientRect(),{left:o,top:a}=r;null==s||s(i-o,n-a);}h();},g=t=>{t.relatedTarget&&t.relatedTarget!==document.documentElement||f(t);},v=t=>{u&&(t.stopPropagation(),t.preventDefault());},b=t=>{u&&t.preventDefault();};document.addEventListener("pointermove",m),document.addEventListener("pointerup",f),document.addEventListener("pointerout",g),document.addEventListener("pointercancel",g),document.addEventListener("touchmove",b,{passive:!1}),document.addEventListener("click",v,{capture:!0}),h=()=>{document.removeEventListener("pointermove",m),document.removeEventListener("pointerup",f),document.removeEventListener("pointerout",g),document.removeEventListener("pointercancel",g),document.removeEventListener("touchmove",b),setTimeout((()=>{document.removeEventListener("click",v,{capture:!0});}),10);};};return t.addEventListener("pointerdown",l),()=>{h(),t.removeEventListener("pointerdown",l);}}(this.wrapper,((t,e,i)=>{this.emit("drag",Math.max(0,Math.min(1,i/this.wrapper.getBoundingClientRect().width)));}),(t=>{this.isDragging=!0,this.emit("dragstart",Math.max(0,Math.min(1,t/this.wrapper.getBoundingClientRect().width)));}),(t=>{this.isDragging=!1,this.emit("dragend",Math.max(0,Math.min(1,t/this.wrapper.getBoundingClientRect().width)));})));}getHeight(t,e){var i;const s=(null===(i=this.audioData)||void 0===i?void 0:i.numberOfChannels)||1;if(null==t)return 128;if(!isNaN(Number(t)))return Number(t);if("auto"===t){const t=this.parent.clientHeight||128;return (null==e?void 0:e.every((t=>!t.overlay)))?t/s:t}return 128}initHtml(){const t=document.createElement("div"),e=t.attachShadow({mode:"open"}),i=this.options.cspNonce&&"string"==typeof this.options.cspNonce?this.options.cspNonce.replace(/"/g,""):"";return e.innerHTML=`\n      <style${i?` nonce="${i}"`:""}>\n        :host {\n          user-select: none;\n          min-width: 1px;\n        }\n        :host audio {\n          display: block;\n          width: 100%;\n        }\n        :host .scroll {\n          overflow-x: auto;\n          overflow-y: hidden;\n          width: 100%;\n          position: relative;\n        }\n        :host .noScrollbar {\n          scrollbar-color: transparent;\n          scrollbar-width: none;\n        }\n        :host .noScrollbar::-webkit-scrollbar {\n          display: none;\n          -webkit-appearance: none;\n        }\n        :host .wrapper {\n          position: relative;\n          overflow: visible;\n          z-index: 2;\n        }\n        :host .canvases {\n          min-height: ${this.getHeight(this.options.height,this.options.splitChannels)}px;\n        }\n        :host .canvases > div {\n          position: relative;\n        }\n        :host canvas {\n          display: block;\n          position: absolute;\n          top: 0;\n          image-rendering: pixelated;\n        }\n        :host .progress {\n          pointer-events: none;\n          position: absolute;\n          z-index: 2;\n          top: 0;\n          left: 0;\n          width: 0;\n          height: 100%;\n          overflow: hidden;\n        }\n        :host .progress > div {\n          position: relative;\n        }\n        :host .cursor {\n          pointer-events: none;\n          position: absolute;\n          z-index: 5;\n          top: 0;\n          left: 0;\n          height: 100%;\n          border-radius: 2px;\n        }\n      </style>\n\n      <div class="scroll" part="scroll">\n        <div class="wrapper" part="wrapper">\n          <div class="canvases" part="canvases"></div>\n          <div class="progress" part="progress"></div>\n          <div class="cursor" part="cursor"></div>\n        </div>\n      </div>\n    `,[t,e]}setOptions(t){if(this.options.container!==t.container){const e=this.parentFromOptionsContainer(t.container);e.appendChild(this.container),this.parent=e;}!0!==t.dragToSeek&&"object"!=typeof this.options.dragToSeek||this.initDrag(),this.options=t,this.reRender();}getWrapper(){return this.wrapper}getWidth(){return this.scrollContainer.clientWidth}getScroll(){return this.scrollContainer.scrollLeft}setScroll(t){this.scrollContainer.scrollLeft=t;}setScrollPercentage(t){const{scrollWidth:e}=this.scrollContainer,i=e*t;this.setScroll(i);}destroy(){var t,e;this.subscriptions.forEach((t=>t())),this.container.remove(),null===(t=this.resizeObserver)||void 0===t||t.disconnect(),null===(e=this.unsubscribeOnScroll)||void 0===e||e.forEach((t=>t())),this.unsubscribeOnScroll=[];}createDelay(t=10){let e,i;const s=()=>{e&&clearTimeout(e),i&&i();};return this.timeouts.push(s),()=>new Promise(((n,r)=>{s(),i=r,e=setTimeout((()=>{e=void 0,i=void 0,n();}),t);}))}convertColorValues(t){if(!Array.isArray(t))return t||"";if(t.length<2)return t[0]||"";const e=document.createElement("canvas"),i=e.getContext("2d"),s=e.height*(window.devicePixelRatio||1),n=i.createLinearGradient(0,0,0,s),r=1/(t.length-1);return t.forEach(((t,e)=>{const i=e*r;n.addColorStop(i,t);})),n}getPixelRatio(){return Math.max(1,window.devicePixelRatio||1)}renderBarWaveform(t,e,i,s){const n=t[0],r=t[1]||t[0],o=n.length,{width:a,height:h}=i.canvas,l=h/2,d=this.getPixelRatio(),c=e.barWidth?e.barWidth*d:1,u=e.barGap?e.barGap*d:e.barWidth?c/2:0,p=e.barRadius||0,m=a/(c+u)/o,f=p&&"roundRect"in i?"roundRect":"rect";i.beginPath();let g=0,v=0,b=0;for(let t=0;t<=o;t++){const o=Math.round(t*m);if(o>g){const t=Math.round(v*l*s),n=t+Math.round(b*l*s)||1;let r=l-t;"top"===e.barAlign?r=0:"bottom"===e.barAlign&&(r=h-n),i[f](g*(c+u),r,c,n,p),g=o,v=0,b=0;}const a=Math.abs(n[t]||0),d=Math.abs(r[t]||0);a>v&&(v=a),d>b&&(b=d);}i.fill(),i.closePath();}renderLineWaveform(t,e,i,s){const n=e=>{const n=t[e]||t[0],r=n.length,{height:o}=i.canvas,a=o/2,h=i.canvas.width/r;i.moveTo(0,a);let l=0,d=0;for(let t=0;t<=r;t++){const r=Math.round(t*h);if(r>l){const t=a+(Math.round(d*a*s)||1)*(0===e?-1:1);i.lineTo(l,t),l=r,d=0;}const o=Math.abs(n[t]||0);o>d&&(d=o);}i.lineTo(l,a);};i.beginPath(),n(0),n(1),i.fill(),i.closePath();}renderWaveform(t,e,i){if(i.fillStyle=this.convertColorValues(e.waveColor),e.renderFunction)return void e.renderFunction(t,i);let s=e.barHeight||1;if(e.normalize){const e=Array.from(t[0]).reduce(((t,e)=>Math.max(t,Math.abs(e))),0);s=e?1/e:1;}e.barWidth||e.barGap||e.barAlign?this.renderBarWaveform(t,e,i,s):this.renderLineWaveform(t,e,i,s);}renderSingleCanvas(t,e,i,s,n,r,o){const a=this.getPixelRatio(),h=document.createElement("canvas");h.width=Math.round(i*a),h.height=Math.round(s*a),h.style.width=`${i}px`,h.style.height=`${s}px`,h.style.left=`${Math.round(n)}px`,r.appendChild(h);const l=h.getContext("2d");if(this.renderWaveform(t,e,l),h.width>0&&h.height>0){const t=h.cloneNode(),i=t.getContext("2d");i.drawImage(h,0,0),i.globalCompositeOperation="source-in",i.fillStyle=this.convertColorValues(e.progressColor),i.fillRect(0,0,h.width,h.height),o.appendChild(t);}}renderMultiCanvas(t,e,i,s,n,r){const o=this.getPixelRatio(),{clientWidth:a}=this.scrollContainer,l=i/o;let d=Math.min(h.MAX_CANVAS_WIDTH,a,l),c={};if(0===d)return;if(e.barWidth||e.barGap){const t=e.barWidth||.5,i=t+(e.barGap||t/2);d%i!=0&&(d=Math.floor(d/i)*i);}const u=i=>{if(i<0||i>=p)return;if(c[i])return;c[i]=!0;const o=i*d,a=Math.min(l-o,d);if(a<=0)return;const h=t.map((t=>{const e=Math.floor(o/l*t.length),i=Math.floor((o+a)/l*t.length);return t.slice(e,i)}));this.renderSingleCanvas(h,e,a,s,o,n,r);},p=Math.ceil(l/d);if(!this.isScrollable){for(let t=0;t<p;t++)u(t);return}const m=this.scrollContainer.scrollLeft/l,f=Math.floor(m*p);if(u(f-1),u(f),u(f+1),p>1){const t=this.on("scroll",(()=>{const{scrollLeft:t}=this.scrollContainer,e=Math.floor(t/l*p);Object.keys(c).length>h.MAX_NODES&&(n.innerHTML="",r.innerHTML="",c={}),u(e-1),u(e),u(e+1);}));this.unsubscribeOnScroll.push(t);}}renderChannel(t,e,i,s){var{overlay:n}=e,r=function(t,e){var i={};for(var s in t)Object.prototype.hasOwnProperty.call(t,s)&&e.indexOf(s)<0&&(i[s]=t[s]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols){var n=0;for(s=Object.getOwnPropertySymbols(t);n<s.length;n++)e.indexOf(s[n])<0&&Object.prototype.propertyIsEnumerable.call(t,s[n])&&(i[s[n]]=t[s[n]]);}return i}(e,["overlay"]);const o=document.createElement("div"),a=this.getHeight(r.height,r.splitChannels);o.style.height=`${a}px`,n&&s>0&&(o.style.marginTop=`-${a}px`),this.canvasWrapper.style.minHeight=`${a}px`,this.canvasWrapper.appendChild(o);const h=o.cloneNode();this.progressWrapper.appendChild(h),this.renderMultiCanvas(t,r,i,a,o,h);}render(e){return t$1(this,void 0,void 0,(function*(){var t;this.timeouts.forEach((t=>t())),this.timeouts=[],this.canvasWrapper.innerHTML="",this.progressWrapper.innerHTML="",null!=this.options.width&&(this.scrollContainer.style.width="number"==typeof this.options.width?`${this.options.width}px`:this.options.width);const i=this.getPixelRatio(),s=this.scrollContainer.clientWidth,n=Math.ceil(e.duration*(this.options.minPxPerSec||0));this.isScrollable=n>s;const r=this.options.fillParent&&!this.isScrollable,o=(r?s:n)*i;if(this.wrapper.style.width=r?"100%":`${n}px`,this.scrollContainer.style.overflowX=this.isScrollable?"auto":"hidden",this.scrollContainer.classList.toggle("noScrollbar",!!this.options.hideScrollbar),this.cursor.style.backgroundColor=`${this.options.cursorColor||this.options.progressColor}`,this.cursor.style.width=`${this.options.cursorWidth}px`,this.audioData=e,this.emit("render"),this.options.splitChannels)for(let i=0;i<e.numberOfChannels;i++){const s=Object.assign(Object.assign({},this.options),null===(t=this.options.splitChannels)||void 0===t?void 0:t[i]);this.renderChannel([e.getChannelData(i)],s,o,i);}else {const t=[e.getChannelData(0)];e.numberOfChannels>1&&t.push(e.getChannelData(1)),this.renderChannel(t,this.options,o,0);}Promise.resolve().then((()=>this.emit("rendered")));}))}reRender(){if(this.unsubscribeOnScroll.forEach((t=>t())),this.unsubscribeOnScroll=[],!this.audioData)return;const{scrollWidth:t}=this.scrollContainer,{right:e}=this.progressWrapper.getBoundingClientRect();if(this.render(this.audioData),this.isScrollable&&t!==this.scrollContainer.scrollWidth){const{right:t}=this.progressWrapper.getBoundingClientRect();let i=t-e;i*=2,i=i<0?Math.floor(i):Math.ceil(i),i/=2,this.scrollContainer.scrollLeft+=i;}}zoom(t){this.options.minPxPerSec=t,this.reRender();}scrollIntoView(t,e=!1){const{scrollLeft:i,scrollWidth:s,clientWidth:n}=this.scrollContainer,r=t*s,o=i,a=i+n,h=n/2;if(this.isDragging){const t=30;r+t>a?this.scrollContainer.scrollLeft+=t:r-t<o&&(this.scrollContainer.scrollLeft-=t);}else {(r<o||r>a)&&(this.scrollContainer.scrollLeft=r-(this.options.autoCenter?h:0));const t=r-i-h;e&&this.options.autoCenter&&t>0&&(this.scrollContainer.scrollLeft+=Math.min(t,10));}{const t=this.scrollContainer.scrollLeft,e=t/s,i=(t+n)/s;this.emit("scroll",e,i,t,t+n);}}renderProgress(t,e){if(isNaN(t))return;const i=100*t;this.canvasWrapper.style.clipPath=`polygon(${i}% 0, 100% 0, 100% 100%, ${i}% 100%)`,this.progressWrapper.style.width=`${i}%`,this.cursor.style.left=`${i}%`,this.cursor.style.transform=`translateX(-${100===Math.round(i)?this.options.cursorWidth:0}px)`,this.isScrollable&&this.options.autoScroll&&this.scrollIntoView(t,e);}exportImage(e,i,s){return t$1(this,void 0,void 0,(function*(){const t=this.canvasWrapper.querySelectorAll("canvas");if(!t.length)throw new Error("No waveform data");if("dataURL"===s){const s=Array.from(t).map((t=>t.toDataURL(e,i)));return Promise.resolve(s)}return Promise.all(Array.from(t).map((t=>new Promise(((s,n)=>{t.toBlob((t=>{t?s(t):n(new Error("Could not export image"));}),e,i);})))))}))}}h.MAX_CANVAS_WIDTH=8e3,h.MAX_NODES=10;class l extends e$1{constructor(){super(...arguments),this.unsubscribe=()=>{};}start(){this.unsubscribe=this.on("tick",(()=>{requestAnimationFrame((()=>{this.emit("tick");}));})),this.emit("tick");}stop(){this.unsubscribe();}destroy(){this.unsubscribe();}}class d extends e$1{constructor(t=new AudioContext){super(),this.bufferNode=null,this.playStartTime=0,this.playedDuration=0,this._muted=!1,this._playbackRate=1,this._duration=void 0,this.buffer=null,this.currentSrc="",this.paused=!0,this.crossOrigin=null,this.seeking=!1,this.autoplay=!1,this.addEventListener=this.on,this.removeEventListener=this.un,this.audioContext=t,this.gainNode=this.audioContext.createGain(),this.gainNode.connect(this.audioContext.destination);}load(){return t$1(this,void 0,void 0,(function*(){}))}get src(){return this.currentSrc}set src(t){if(this.currentSrc=t,this._duration=void 0,!t)return this.buffer=null,void this.emit("emptied");fetch(t).then((e=>{if(e.status>=400)throw new Error(`Failed to fetch ${t}: ${e.status} (${e.statusText})`);return e.arrayBuffer()})).then((e=>this.currentSrc!==t?null:this.audioContext.decodeAudioData(e))).then((e=>{this.currentSrc===t&&(this.buffer=e,this.emit("loadedmetadata"),this.emit("canplay"),this.autoplay&&this.play());}));}_play(){var t;if(!this.paused)return;this.paused=!1,null===(t=this.bufferNode)||void 0===t||t.disconnect(),this.bufferNode=this.audioContext.createBufferSource(),this.buffer&&(this.bufferNode.buffer=this.buffer),this.bufferNode.playbackRate.value=this._playbackRate,this.bufferNode.connect(this.gainNode);let e=this.playedDuration*this._playbackRate;(e>=this.duration||e<0)&&(e=0,this.playedDuration=0),this.bufferNode.start(this.audioContext.currentTime,e),this.playStartTime=this.audioContext.currentTime,this.bufferNode.onended=()=>{this.currentTime>=this.duration&&(this.pause(),this.emit("ended"));};}_pause(){var t;this.paused=!0,null===(t=this.bufferNode)||void 0===t||t.stop(),this.playedDuration+=this.audioContext.currentTime-this.playStartTime;}play(){return t$1(this,void 0,void 0,(function*(){this.paused&&(this._play(),this.emit("play"));}))}pause(){this.paused||(this._pause(),this.emit("pause"));}stopAt(t){const e=t-this.currentTime,i=this.bufferNode;null==i||i.stop(this.audioContext.currentTime+e),null==i||i.addEventListener("ended",(()=>{i===this.bufferNode&&(this.bufferNode=null,this.pause());}),{once:!0});}setSinkId(e){return t$1(this,void 0,void 0,(function*(){return this.audioContext.setSinkId(e)}))}get playbackRate(){return this._playbackRate}set playbackRate(t){this._playbackRate=t,this.bufferNode&&(this.bufferNode.playbackRate.value=t);}get currentTime(){return (this.paused?this.playedDuration:this.playedDuration+(this.audioContext.currentTime-this.playStartTime))*this._playbackRate}set currentTime(t){const e=!this.paused;e&&this._pause(),this.playedDuration=t/this._playbackRate,e&&this._play(),this.emit("seeking"),this.emit("timeupdate");}get duration(){var t,e;return null!==(t=this._duration)&&void 0!==t?t:(null===(e=this.buffer)||void 0===e?void 0:e.duration)||0}set duration(t){this._duration=t;}get volume(){return this.gainNode.gain.value}set volume(t){this.gainNode.gain.value=t,this.emit("volumechange");}get muted(){return this._muted}set muted(t){this._muted!==t&&(this._muted=t,this._muted?this.gainNode.disconnect():this.gainNode.connect(this.audioContext.destination));}canPlayType(t){return /^(audio|video)\//.test(t)}getGainNode(){return this.gainNode}getChannelData(){const t=[];if(!this.buffer)return t;const e=this.buffer.numberOfChannels;for(let i=0;i<e;i++)t.push(this.buffer.getChannelData(i));return t}}const c={waveColor:"#999",progressColor:"#555",cursorWidth:1,minPxPerSec:0,fillParent:!0,interact:!0,dragToSeek:!1,autoScroll:!0,autoCenter:!0,sampleRate:8e3};class u extends a{static create(t){return new u(t)}constructor(t){const e=t.media||("WebAudio"===t.backend?new d:void 0);super({media:e,mediaControls:t.mediaControls,autoplay:t.autoplay,playbackRate:t.audioRate}),this.plugins=[],this.decodedData=null,this.stopAtPosition=null,this.subscriptions=[],this.mediaSubscriptions=[],this.abortController=null,this.options=Object.assign({},c,t),this.timer=new l;const i=e?void 0:this.getMediaElement();this.renderer=new h(this.options,i),this.initPlayerEvents(),this.initRendererEvents(),this.initTimerEvents(),this.initPlugins();const s=this.options.url||this.getSrc()||"";Promise.resolve().then((()=>{this.emit("init");const{peaks:t,duration:e}=this.options;(s||t&&e)&&this.load(s,t,e).catch((()=>null));}));}updateProgress(t=this.getCurrentTime()){return this.renderer.renderProgress(t/this.getDuration(),this.isPlaying()),t}initTimerEvents(){this.subscriptions.push(this.timer.on("tick",(()=>{if(!this.isSeeking()){const t=this.updateProgress();this.emit("timeupdate",t),this.emit("audioprocess",t),null!=this.stopAtPosition&&this.isPlaying()&&t>=this.stopAtPosition&&this.pause();}})));}initPlayerEvents(){this.isPlaying()&&(this.emit("play"),this.timer.start()),this.mediaSubscriptions.push(this.onMediaEvent("timeupdate",(()=>{const t=this.updateProgress();this.emit("timeupdate",t);})),this.onMediaEvent("play",(()=>{this.emit("play"),this.timer.start();})),this.onMediaEvent("pause",(()=>{this.emit("pause"),this.timer.stop(),this.stopAtPosition=null;})),this.onMediaEvent("emptied",(()=>{this.timer.stop(),this.stopAtPosition=null;})),this.onMediaEvent("ended",(()=>{this.emit("timeupdate",this.getDuration()),this.emit("finish"),this.stopAtPosition=null;})),this.onMediaEvent("seeking",(()=>{this.emit("seeking",this.getCurrentTime());})),this.onMediaEvent("error",(()=>{var t;this.emit("error",null!==(t=this.getMediaElement().error)&&void 0!==t?t:new Error("Media error")),this.stopAtPosition=null;})));}initRendererEvents(){this.subscriptions.push(this.renderer.on("click",((t,e)=>{this.options.interact&&(this.seekTo(t),this.emit("interaction",t*this.getDuration()),this.emit("click",t,e));})),this.renderer.on("dblclick",((t,e)=>{this.emit("dblclick",t,e);})),this.renderer.on("scroll",((t,e,i,s)=>{const n=this.getDuration();this.emit("scroll",t*n,e*n,i,s);})),this.renderer.on("render",(()=>{this.emit("redraw");})),this.renderer.on("rendered",(()=>{this.emit("redrawcomplete");})),this.renderer.on("dragstart",(t=>{this.emit("dragstart",t);})),this.renderer.on("dragend",(t=>{this.emit("dragend",t);})));{let t;this.subscriptions.push(this.renderer.on("drag",(e=>{if(!this.options.interact)return;let i;this.renderer.renderProgress(e),clearTimeout(t),this.isPlaying()?i=0:!0===this.options.dragToSeek?i=200:"object"==typeof this.options.dragToSeek&&void 0!==this.options.dragToSeek&&(i=this.options.dragToSeek.debounceTime),t=setTimeout((()=>{this.seekTo(e);}),i),this.emit("interaction",e*this.getDuration()),this.emit("drag",e);})));}}initPlugins(){var t;(null===(t=this.options.plugins)||void 0===t?void 0:t.length)&&this.options.plugins.forEach((t=>{this.registerPlugin(t);}));}unsubscribePlayerEvents(){this.mediaSubscriptions.forEach((t=>t())),this.mediaSubscriptions=[];}setOptions(t){this.options=Object.assign({},this.options,t),t.duration&&!t.peaks&&(this.decodedData=i$1.createBuffer(this.exportPeaks(),t.duration)),t.peaks&&t.duration&&(this.decodedData=i$1.createBuffer(t.peaks,t.duration)),this.renderer.setOptions(this.options),t.audioRate&&this.setPlaybackRate(t.audioRate),null!=t.mediaControls&&(this.getMediaElement().controls=t.mediaControls);}registerPlugin(t){return t._init(this),this.plugins.push(t),this.subscriptions.push(t.once("destroy",(()=>{this.plugins=this.plugins.filter((e=>e!==t));}))),t}getWrapper(){return this.renderer.getWrapper()}getWidth(){return this.renderer.getWidth()}getScroll(){return this.renderer.getScroll()}setScroll(t){return this.renderer.setScroll(t)}setScrollTime(t){const e=t/this.getDuration();this.renderer.setScrollPercentage(e);}getActivePlugins(){return this.plugins}loadAudio(e,s,n,r){return t$1(this,void 0,void 0,(function*(){var t;if(this.emit("load",e),!this.options.media&&this.isPlaying()&&this.pause(),this.decodedData=null,this.stopAtPosition=null,!s&&!n){const i=this.options.fetchParams||{};window.AbortController&&!i.signal&&(this.abortController=new AbortController,i.signal=null===(t=this.abortController)||void 0===t?void 0:t.signal);const n=t=>this.emit("loading",t);s=yield o$1.fetchBlob(e,n,i);const r=this.options.blobMimeType;r&&(s=new Blob([s],{type:r}));}this.setSrc(e,s);const a=yield new Promise((t=>{const e=r||this.getDuration();e?t(e):this.mediaSubscriptions.push(this.onMediaEvent("loadedmetadata",(()=>t(this.getDuration())),{once:!0}));}));if(!e&&!s){const t=this.getMediaElement();t instanceof d&&(t.duration=a);}if(n)this.decodedData=i$1.createBuffer(n,a||0);else if(s){const t=yield s.arrayBuffer();this.decodedData=yield i$1.decode(t,this.options.sampleRate);}this.decodedData&&(this.emit("decode",this.getDuration()),this.renderer.render(this.decodedData)),this.emit("ready",this.getDuration());}))}load(e,i,s){return t$1(this,void 0,void 0,(function*(){try{return yield this.loadAudio(e,void 0,i,s)}catch(t){throw this.emit("error",t),t}}))}loadBlob(e,i,s){return t$1(this,void 0,void 0,(function*(){try{return yield this.loadAudio("",e,i,s)}catch(t){throw this.emit("error",t),t}}))}zoom(t){if(!this.decodedData)throw new Error("No audio loaded");this.renderer.zoom(t),this.emit("zoom",t);}getDecodedData(){return this.decodedData}exportPeaks({channels:t=2,maxLength:e=8e3,precision:i=1e4}={}){if(!this.decodedData)throw new Error("The audio has not been decoded yet");const s=Math.min(t,this.decodedData.numberOfChannels),n=[];for(let t=0;t<s;t++){const s=this.decodedData.getChannelData(t),r=[],o=s.length/e;for(let t=0;t<e;t++){const e=s.slice(Math.floor(t*o),Math.ceil((t+1)*o));let n=0;for(let t=0;t<e.length;t++){const i=e[t];Math.abs(i)>Math.abs(n)&&(n=i);}r.push(Math.round(n*i)/i);}n.push(r);}return n}getDuration(){let t=super.getDuration()||0;return 0!==t&&t!==1/0||!this.decodedData||(t=this.decodedData.duration),t}toggleInteraction(t){this.options.interact=t;}setTime(t){this.stopAtPosition=null,super.setTime(t),this.updateProgress(t),this.emit("timeupdate",t);}seekTo(t){const e=this.getDuration()*t;this.setTime(e);}play(e,i){const s=Object.create(null,{play:{get:()=>super.play}});return t$1(this,void 0,void 0,(function*(){null!=e&&this.setTime(e);const t=yield s.play.call(this);return null!=i&&(this.media instanceof d?this.media.stopAt(i):this.stopAtPosition=i),t}))}playPause(){return t$1(this,void 0,void 0,(function*(){return this.isPlaying()?this.pause():this.play()}))}stop(){this.pause(),this.setTime(0);}skip(t){this.setTime(this.getCurrentTime()+t);}empty(){this.load("",[[0]],.001);}setMediaElement(t){this.unsubscribePlayerEvents(),super.setMediaElement(t),this.initPlayerEvents();}exportImage(){return t$1(this,arguments,void 0,(function*(t="image/png",e=1,i="dataURL"){return this.renderer.exportImage(t,e,i)}))}destroy(){var t;this.emit("destroy"),null===(t=this.abortController)||void 0===t||t.abort(),this.plugins.forEach((t=>t.destroy())),this.subscriptions.forEach((t=>t())),this.unsubscribePlayerEvents(),this.timer.destroy(),this.renderer.destroy(),super.destroy();}}u.BasePlugin=class extends e$1{constructor(t){super(),this.subscriptions=[],this.options=t;}onInit(){}_init(t){this.wavesurfer=t,this.onInit();}destroy(){this.emit("destroy"),this.subscriptions.forEach((t=>t()));}},u.dom=r$1;

    class t{constructor(){this.listeners={};}on(t,e,i){if(this.listeners[t]||(this.listeners[t]=new Set),this.listeners[t].add(e),null==i?void 0:i.once){const i=()=>{this.un(t,i),this.un(t,e);};return this.on(t,i),i}return ()=>this.un(t,e)}un(t,e){var i;null===(i=this.listeners[t])||void 0===i||i.delete(e);}once(t,e){return this.on(t,e,{once:!0})}unAll(){this.listeners={};}emit(t,...e){this.listeners[t]&&this.listeners[t].forEach((t=>t(...e)));}}class e extends t{constructor(t){super(),this.subscriptions=[],this.options=t;}onInit(){}_init(t){this.wavesurfer=t,this.onInit();}destroy(){this.emit("destroy"),this.subscriptions.forEach((t=>t()));}}function i(t,e,i,n,s=3,r=0,o=100){if(!t)return ()=>{};const a=matchMedia("(pointer: coarse)").matches;let h=()=>{};const l=l=>{if(l.button!==r)return;l.preventDefault(),l.stopPropagation();let d=l.clientX,c=l.clientY,u=!1;const v=Date.now(),g=n=>{if(n.preventDefault(),n.stopPropagation(),a&&Date.now()-v<o)return;const r=n.clientX,h=n.clientY,l=r-d,g=h-c;if(u||Math.abs(l)>s||Math.abs(g)>s){const n=t.getBoundingClientRect(),{left:s,top:o}=n;u||(null==i||i(d-s,c-o),u=!0),e(l,g,r-s,h-o),d=r,c=h;}},p=e=>{if(u){const i=e.clientX,s=e.clientY,r=t.getBoundingClientRect(),{left:o,top:a}=r;null==n||n(i-o,s-a);}h();},m=t=>{t.relatedTarget&&t.relatedTarget!==document.documentElement||p(t);},f=t=>{u&&(t.stopPropagation(),t.preventDefault());},b=t=>{u&&t.preventDefault();};document.addEventListener("pointermove",g),document.addEventListener("pointerup",p),document.addEventListener("pointerout",m),document.addEventListener("pointercancel",m),document.addEventListener("touchmove",b,{passive:!1}),document.addEventListener("click",f,{capture:!0}),h=()=>{document.removeEventListener("pointermove",g),document.removeEventListener("pointerup",p),document.removeEventListener("pointerout",m),document.removeEventListener("pointercancel",m),document.removeEventListener("touchmove",b),setTimeout((()=>{document.removeEventListener("click",f,{capture:!0});}),10);};};return t.addEventListener("pointerdown",l),()=>{h(),t.removeEventListener("pointerdown",l);}}function n(t,e){const i=e.xmlns?document.createElementNS(e.xmlns,t):document.createElement(t);for(const[t,s]of Object.entries(e))if("children"===t)for(const[t,s]of Object.entries(e))"string"==typeof s?i.appendChild(document.createTextNode(s)):i.appendChild(n(t,s));else "style"===t?Object.assign(i.style,s):"textContent"===t?i.textContent=s:i.setAttribute(t,s.toString());return i}function s(t,e,i){const s=n(t,e||{});return null==i||i.appendChild(s),s}class r extends t{constructor(t,e,i=0){var n,s,r,o,a,h,l,d,c,u;super(),this.totalDuration=e,this.numberOfChannels=i,this.minLength=0,this.maxLength=1/0,this.contentEditable=!1,this.subscriptions=[],this.subscriptions=[],this.id=t.id||`region-${Math.random().toString(32).slice(2)}`,this.start=this.clampPosition(t.start),this.end=this.clampPosition(null!==(n=t.end)&&void 0!==n?n:t.start),this.drag=null===(s=t.drag)||void 0===s||s,this.resize=null===(r=t.resize)||void 0===r||r,this.resizeStart=null===(o=t.resizeStart)||void 0===o||o,this.resizeEnd=null===(a=t.resizeEnd)||void 0===a||a,this.color=null!==(h=t.color)&&void 0!==h?h:"rgba(0, 0, 0, 0.1)",this.minLength=null!==(l=t.minLength)&&void 0!==l?l:this.minLength,this.maxLength=null!==(d=t.maxLength)&&void 0!==d?d:this.maxLength,this.channelIdx=null!==(c=t.channelIdx)&&void 0!==c?c:-1,this.contentEditable=null!==(u=t.contentEditable)&&void 0!==u?u:this.contentEditable,this.element=this.initElement(),this.setContent(t.content),this.setPart(),this.renderPosition(),this.initMouseEvents();}clampPosition(t){return Math.max(0,Math.min(this.totalDuration,t))}setPart(){const t=this.start===this.end;this.element.setAttribute("part",`${t?"marker":"region"} ${this.id}`);}addResizeHandles(t){const e={position:"absolute",zIndex:"2",width:"6px",height:"100%",top:"0",cursor:"ew-resize",wordBreak:"keep-all"},n=s("div",{part:"region-handle region-handle-left",style:Object.assign(Object.assign({},e),{left:"0",borderLeft:"2px solid rgba(0, 0, 0, 0.5)",borderRadius:"2px 0 0 2px"})},t),r=s("div",{part:"region-handle region-handle-right",style:Object.assign(Object.assign({},e),{right:"0",borderRight:"2px solid rgba(0, 0, 0, 0.5)",borderRadius:"0 2px 2px 0"})},t);this.subscriptions.push(i(n,(t=>this.onResize(t,"start")),(()=>null),(()=>this.onEndResizing()),1),i(r,(t=>this.onResize(t,"end")),(()=>null),(()=>this.onEndResizing()),1));}removeResizeHandles(t){const e=t.querySelector('[part*="region-handle-left"]'),i=t.querySelector('[part*="region-handle-right"]');e&&t.removeChild(e),i&&t.removeChild(i);}initElement(){const t=this.start===this.end;let e=0,i=100;this.channelIdx>=0&&this.channelIdx<this.numberOfChannels&&(i=100/this.numberOfChannels,e=i*this.channelIdx);const n=s("div",{style:{position:"absolute",top:`${e}%`,height:`${i}%`,backgroundColor:t?"none":this.color,borderLeft:t?"2px solid "+this.color:"none",borderRadius:"2px",boxSizing:"border-box",transition:"background-color 0.2s ease",cursor:this.drag?"grab":"default",pointerEvents:"all"}});return !t&&this.resize&&this.addResizeHandles(n),n}renderPosition(){const t=this.start/this.totalDuration,e=(this.totalDuration-this.end)/this.totalDuration;this.element.style.left=100*t+"%",this.element.style.right=100*e+"%";}toggleCursor(t){var e;this.drag&&(null===(e=this.element)||void 0===e?void 0:e.style)&&(this.element.style.cursor=t?"grabbing":"grab");}initMouseEvents(){const{element:t}=this;t&&(t.addEventListener("click",(t=>this.emit("click",t))),t.addEventListener("mouseenter",(t=>this.emit("over",t))),t.addEventListener("mouseleave",(t=>this.emit("leave",t))),t.addEventListener("dblclick",(t=>this.emit("dblclick",t))),t.addEventListener("pointerdown",(()=>this.toggleCursor(!0))),t.addEventListener("pointerup",(()=>this.toggleCursor(!1))),this.subscriptions.push(i(t,(t=>this.onMove(t)),(()=>this.toggleCursor(!0)),(()=>{this.toggleCursor(!1),this.drag&&this.emit("update-end");}))),this.contentEditable&&this.content&&(this.content.addEventListener("click",(t=>this.onContentClick(t))),this.content.addEventListener("blur",(()=>this.onContentBlur()))));}_onUpdate(t,e){if(!this.element.parentElement)return;const{width:i}=this.element.parentElement.getBoundingClientRect(),n=t/i*this.totalDuration,s=e&&"start"!==e?this.start:this.start+n,r=e&&"end"!==e?this.end:this.end+n,o=r-s;s>=0&&r<=this.totalDuration&&s<=r&&o>=this.minLength&&o<=this.maxLength&&(this.start=s,this.end=r,this.renderPosition(),this.emit("update",e));}onMove(t){this.drag&&this._onUpdate(t);}onResize(t,e){this.resize&&(this.resizeStart||"start"!==e)&&(this.resizeEnd||"end"!==e)&&this._onUpdate(t,e);}onEndResizing(){this.resize&&this.emit("update-end");}onContentClick(t){t.stopPropagation();t.target.focus(),this.emit("click",t);}onContentBlur(){this.emit("update-end");}_setTotalDuration(t){this.totalDuration=t,this.renderPosition();}play(t){this.emit("play",t&&this.end!==this.start?this.end:void 0);}getContent(t=!1){var e;return t?this.content||void 0:this.element instanceof HTMLElement?(null===(e=this.content)||void 0===e?void 0:e.innerHTML)||void 0:""}setContent(t){var e;if(null===(e=this.content)||void 0===e||e.remove(),t){if("string"==typeof t){const e=this.start===this.end;this.content=s("div",{style:{padding:`0.2em ${e?.2:.4}em`,display:"inline-block"},textContent:t});}else this.content=t;this.contentEditable&&(this.content.contentEditable="true"),this.content.setAttribute("part","region-content"),this.element.appendChild(this.content),this.emit("content-changed");}else this.content=void 0;}setOptions(t){var e,i;if(t.color&&(this.color=t.color,this.element.style.backgroundColor=this.color),void 0!==t.drag&&(this.drag=t.drag,this.element.style.cursor=this.drag?"grab":"default"),void 0!==t.start||void 0!==t.end){const n=this.start===this.end;this.start=this.clampPosition(null!==(e=t.start)&&void 0!==e?e:this.start),this.end=this.clampPosition(null!==(i=t.end)&&void 0!==i?i:n?this.start:this.end),this.renderPosition(),this.setPart();}if(t.content&&this.setContent(t.content),t.id&&(this.id=t.id,this.setPart()),void 0!==t.resize&&t.resize!==this.resize){const e=this.start===this.end;this.resize=t.resize,this.resize&&!e?this.addResizeHandles(this.element):this.removeResizeHandles(this.element);}void 0!==t.resizeStart&&(this.resizeStart=t.resizeStart),void 0!==t.resizeEnd&&(this.resizeEnd=t.resizeEnd);}remove(){this.emit("remove"),this.subscriptions.forEach((t=>t())),this.element.remove(),this.element=null;}}class o extends e{constructor(t){super(t),this.regions=[],this.regionsContainer=this.initRegionsContainer();}static create(t){return new o(t)}onInit(){if(!this.wavesurfer)throw Error("WaveSurfer is not initialized");this.wavesurfer.getWrapper().appendChild(this.regionsContainer);let t=[];this.subscriptions.push(this.wavesurfer.on("timeupdate",(e=>{const i=this.regions.filter((t=>t.start<=e&&(t.end===t.start?t.start+.05:t.end)>=e));i.forEach((e=>{t.includes(e)||this.emit("region-in",e);})),t.forEach((t=>{i.includes(t)||this.emit("region-out",t);})),t=i;})));}initRegionsContainer(){return s("div",{style:{position:"absolute",top:"0",left:"0",width:"100%",height:"100%",zIndex:"5",pointerEvents:"none"}})}getRegions(){return this.regions}avoidOverlapping(t){t.content&&setTimeout((()=>{const e=t.content,i=e.getBoundingClientRect(),n=this.regions.map((e=>{if(e===t||!e.content)return 0;const n=e.content.getBoundingClientRect();return i.left<n.left+n.width&&n.left<i.left+i.width?n.height:0})).reduce(((t,e)=>t+e),0);e.style.marginTop=`${n}px`;}),10);}adjustScroll(t){var e,i;const n=null===(i=null===(e=this.wavesurfer)||void 0===e?void 0:e.getWrapper())||void 0===i?void 0:i.parentElement;if(!n)return;const{clientWidth:s,scrollWidth:r}=n;if(r<=s)return;const o=n.getBoundingClientRect(),a=t.element.getBoundingClientRect(),h=a.left-o.left,l=a.right-o.left;h<0?n.scrollLeft+=h:l>s&&(n.scrollLeft+=l-s);}virtualAppend(t,e,i){const n=()=>{if(!this.wavesurfer)return;const n=this.wavesurfer.getWidth(),s=this.wavesurfer.getScroll(),r=e.clientWidth,o=this.wavesurfer.getDuration(),a=Math.round(t.start/o*r),h=a+(Math.round((t.end-t.start)/o*r)||1)>s&&a<s+n;h&&!i.parentElement?e.appendChild(i):!h&&i.parentElement&&i.remove();};setTimeout((()=>{if(!this.wavesurfer)return;n();const e=this.wavesurfer.on("scroll",n);this.subscriptions.push(t.once("remove",e),e);}),0);}saveRegion(t){this.virtualAppend(t,this.regionsContainer,t.element),this.avoidOverlapping(t),this.regions.push(t);const e=[t.on("update",(e=>{e||this.adjustScroll(t),this.emit("region-update",t,e);})),t.on("update-end",(()=>{this.avoidOverlapping(t),this.emit("region-updated",t);})),t.on("play",(e=>{var i;null===(i=this.wavesurfer)||void 0===i||i.play(t.start,e);})),t.on("click",(e=>{this.emit("region-clicked",t,e);})),t.on("dblclick",(e=>{this.emit("region-double-clicked",t,e);})),t.on("content-changed",(()=>{this.emit("region-content-changed",t);})),t.once("remove",(()=>{e.forEach((t=>t())),this.regions=this.regions.filter((e=>e!==t)),this.emit("region-removed",t);}))];this.subscriptions.push(...e),this.emit("region-created",t);}addRegion(t){var e,i;if(!this.wavesurfer)throw Error("WaveSurfer is not initialized");const n=this.wavesurfer.getDuration(),s=null===(i=null===(e=this.wavesurfer)||void 0===e?void 0:e.getDecodedData())||void 0===i?void 0:i.numberOfChannels,o=new r(t,n,s);return this.emit("region-initialized",o),n?this.saveRegion(o):this.subscriptions.push(this.wavesurfer.once("ready",(t=>{o._setTotalDuration(t),this.saveRegion(o);}))),o}enableDragSelection(t,e=3){var n;const s=null===(n=this.wavesurfer)||void 0===n?void 0:n.getWrapper();if(!(s&&s instanceof HTMLElement))return ()=>{};let o=null,a=0;return i(s,((t,e,i)=>{o&&o._onUpdate(t,i>a?"end":"start");}),(e=>{var i,n;if(a=e,!this.wavesurfer)return;const s=this.wavesurfer.getDuration(),h=null===(n=null===(i=this.wavesurfer)||void 0===i?void 0:i.getDecodedData())||void 0===n?void 0:n.numberOfChannels,{width:l}=this.wavesurfer.getWrapper().getBoundingClientRect(),d=e/l*s,c=(e+5)/l*s;o=new r(Object.assign(Object.assign({},t),{start:d,end:c}),s,h),this.emit("region-initialized",o),this.regionsContainer.appendChild(o.element);}),(()=>{o&&(this.saveRegion(o),o=null);}),e)}clearRegions(){this.regions.slice().forEach((t=>t.remove())),this.regions=[];}destroy(){this.clearRegions(),super.destroy(),this.regionsContainer.remove();}}

    /**
     * TransientDetector - Detects transients in audio data
     * 
     * This module analyzes audio data to find sudden changes in amplitude
     * that indicate transients (like drum hits, note attacks, etc.)
     */

    class TransientDetector {
      /**
       * Create a new TransientDetector
       * @param {Object} options - Configuration options
       * @param {number} options.density - Controls how many transients to detect (1-100)
       * @param {number} options.randomness - Adds randomness to detection (0-100)
       * @param {number} options.sensitivity - How sensitive detection is (1-100)
       * @param {number} options.minSpacing - Minimum time between transients in seconds
       */
      constructor(options = {}) {
        this.density = options.density ?? 50;
        this.randomness = options.randomness ?? 30;
        this.sensitivity = options.sensitivity ?? 70;
        this.minSpacing = options.minSpacing ?? 0.5;
      }

      /**
       * Detect transients in audio data
       * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
       * @returns {Array<number>} Array of transient positions in seconds
       */
      detectTransients(audioBuffer) {
        if (!audioBuffer) {
          throw new Error('No audio data available');
        }

        // Get audio data from the first channel
        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Parameter adjustments based on properties
        const skipFactor = Math.max(1, Math.round((101 - this.density) * 0.2)); // Higher density = fewer samples skipped
        const randomThreshold = this.randomness / 100; // Probability of keeping a detected transient
        const sensitivity = 1 - (this.sensitivity / 100); // Lower value = more sensitive
        const minSpacingSamples = Math.floor(this.minSpacing * sampleRate); // Convert seconds to samples

        // Basic transient detection using amplitude differential
        const transients = [];
        let prevAvg = 0;
        let windowSize = Math.floor(sampleRate * 0.01); // 10ms window
        let lastTransientSample = -minSpacingSamples; // Initialize to ensure first transient is considered

        // Step through audio data in window-sized chunks
        for (let i = 0; i < rawData.length; i += windowSize * skipFactor) {
          // Calculate RMS of current window
          let sum = 0;
          for (let j = 0; j < windowSize; j++) {
            if (i + j < rawData.length) {
              sum += rawData[i + j] * rawData[i + j];
            }
          }
          const rms = Math.sqrt(sum / windowSize);

          // Detect sudden increase in amplitude
          if (rms > prevAvg * (1 + sensitivity) && rms > 0.01) {
            // Check if we're far enough from the last detected transient
            if (i - lastTransientSample >= minSpacingSamples) {
              // Apply randomness factor
              if (Math.random() > randomThreshold) {
                const time = i / sampleRate;
                if (time > 0 && time < duration) {
                  transients.push(time);
                  lastTransientSample = i; // Update last transient position
                }
              }
            }
          }
          prevAvg = (prevAvg + rms) / 2; // Smooth the comparison
        }

        console.log(`Detected ${transients.length} transients with density ${this.density}, randomness ${this.randomness}, sensitivity ${this.sensitivity}, min spacing ${this.minSpacing}s`);
        
        return transients;
      }

      /**
       * Analyze transient density over time
       * @param {Array<number>} transients - Array of transient positions in seconds
       * @param {number} duration - Total duration of the audio in seconds
       * @param {number} segmentSize - Size of each segment in seconds
       * @returns {Array<Object>} Array of segment data with transient counts
       */
      analyzeTransientDensity(transients, duration, segmentSize = 5) {
        if (!transients || !duration) {
          return [];
        }

        const segments = [];
        const numSegments = Math.ceil(duration / segmentSize);

        // Initialize segments
        for (let i = 0; i < numSegments; i++) {
          segments.push({
            start: i * segmentSize,
            end: Math.min((i + 1) * segmentSize, duration),
            count: 0,
            density: 0
          });
        }

        // Count transients in each segment
        transients.forEach(time => {
          const segmentIndex = Math.min(Math.floor(time / segmentSize), numSegments - 1);
          segments[segmentIndex].count++;
        });

        // Calculate density (transients per second)
        segments.forEach(segment => {
          const segmentDuration = segment.end - segment.start;
          segment.density = segment.count / segmentDuration;
        });

        return segments;
      }
    }

    /**
     * SpectralAnalyzer - Analyzes spectral content of audio
     * 
     * This module analyzes the frequency content of audio data
     * to identify characteristics that can help determine song sections.
     */

    class SpectralAnalyzer {
      /**
       * Create a new SpectralAnalyzer
       * @param {Object} options - Configuration options
       * @param {number} options.fftSize - Size of FFT (default: 2048)
       * @param {number} options.segmentSize - Size of analysis segments in seconds (default: 1)
       */
      constructor(options = {}) {
        this.fftSize = options.fftSize ?? 2048;
        this.segmentSize = options.segmentSize ?? 1;
      }

      /**
       * Analyze the spectral content of an audio buffer
       * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
       * @returns {Array<Object>} Array of spectral data for each segment
       */
      analyzeSpectrum(audioBuffer) {
        if (!audioBuffer) {
          throw new Error('No audio data available');
        }

        const sampleRate = audioBuffer.sampleRate;
        audioBuffer.duration;
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        
        // Calculate how many samples per segment
        const samplesPerSegment = Math.floor(this.segmentSize * sampleRate);
        const numSegments = Math.ceil(channelData.length / samplesPerSegment);
        
        // Create offline audio context for analysis
        const offlineCtx = new OfflineAudioContext(1, channelData.length, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Create analyzer node
        const analyzer = offlineCtx.createAnalyser();
        analyzer.fftSize = this.fftSize;
        const bufferLength = analyzer.frequencyBinCount;
        
        source.connect(analyzer);
        analyzer.connect(offlineCtx.destination);
        
        // Prepare result array
        const spectralData = [];
        
        // Process each segment
        for (let i = 0; i < numSegments; i++) {
          const startSample = i * samplesPerSegment;
          const endSample = Math.min(startSample + samplesPerSegment, channelData.length);
          
          // Create a temporary buffer for this segment
          const segmentBuffer = offlineCtx.createBuffer(1, endSample - startSample, sampleRate);
          const segmentChannelData = segmentBuffer.getChannelData(0);
          
          // Copy data to segment buffer
          for (let j = 0; j < endSample - startSample; j++) {
            segmentChannelData[j] = channelData[startSample + j];
          }
          
          // Analyze this segment
          const frequencyData = new Uint8Array(bufferLength);
          analyzer.getByteFrequencyData(frequencyData);
          
          // Calculate spectral features
          const features = this.calculateSpectralFeatures(frequencyData, sampleRate);
          
          spectralData.push({
            startTime: startSample / sampleRate,
            endTime: endSample / sampleRate,
            ...features
          });
        }
        
        return spectralData;
      }
      
      /**
       * Calculate spectral features from frequency data
       * @param {Uint8Array} frequencyData - Frequency data from analyzer
       * @param {number} sampleRate - Sample rate of the audio
       * @returns {Object} Spectral features
       */
      calculateSpectralFeatures(frequencyData, sampleRate) {
        const bufferLength = frequencyData.length;
        
        // Calculate frequency bands
        // Low (bass): 20-250Hz
        // Mid (vocals, most instruments): 250-4000Hz
        // High (cymbals, hi-hats): 4000-20000Hz
        
        let lowSum = 0;
        let midSum = 0;
        let highSum = 0;
        let totalSum = 0;
        
        // Calculate the bin indices for our frequency bands
        const binWidth = sampleRate / (bufferLength * 2);
        const lowBinCount = Math.min(Math.ceil(250 / binWidth), bufferLength);
        const midBinCount = Math.min(Math.ceil(4000 / binWidth), bufferLength);
        
        // Sum the energy in each band
        for (let i = 0; i < bufferLength; i++) {
          const value = frequencyData[i];
          totalSum += value;
          
          if (i < lowBinCount) {
            lowSum += value;
          } else if (i < midBinCount) {
            midSum += value;
          } else {
            highSum += value;
          }
        }
        
        // Normalize to get relative energy in each band
        const lowEnergy = lowSum / totalSum || 0;
        const midEnergy = midSum / totalSum || 0;
        const highEnergy = highSum / totalSum || 0;
        
        // Calculate spectral centroid (weighted average of frequencies)
        let centroidNumerator = 0;
        let centroidDenominator = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const frequency = i * binWidth;
          const amplitude = frequencyData[i];
          
          centroidNumerator += frequency * amplitude;
          centroidDenominator += amplitude;
        }
        
        const spectralCentroid = centroidDenominator !== 0 ? 
          centroidNumerator / centroidDenominator : 0;
        
        // Calculate spectral flux (how quickly the spectrum changes)
        // This would require comparing with previous frames, simplified here
        
        return {
          lowEnergy,
          midEnergy,
          highEnergy,
          spectralCentroid,
          totalEnergy: totalSum / bufferLength
        };
      }
      
      /**
       * Identify potential section boundaries based on spectral changes
       * @param {Array<Object>} spectralData - Spectral data from analyzeSpectrum
       * @param {number} threshold - Threshold for detecting changes (0-1)
       * @returns {Array<number>} Array of potential section boundary times in seconds
       */
      findSectionBoundaries(spectralData, threshold = 0.15) {
        if (!spectralData || spectralData.length < 2) {
          return [];
        }
        
        const boundaries = [];
        const diffScores = [];
        
        // Calculate differences between consecutive segments
        for (let i = 1; i < spectralData.length; i++) {
          const prev = spectralData[i - 1];
          const curr = spectralData[i];
          
          // Calculate a difference score based on multiple features
          const lowDiff = Math.abs(curr.lowEnergy - prev.lowEnergy);
          const midDiff = Math.abs(curr.midEnergy - prev.midEnergy);
          const highDiff = Math.abs(curr.highEnergy - prev.highEnergy);
          const centroidDiff = Math.abs(curr.spectralCentroid - prev.spectralCentroid) /
            (prev.spectralCentroid || 1); // Normalize by previous value
          
          // Weight the differences (can be adjusted)
          const diffScore = (lowDiff * 0.3) + (midDiff * 0.3) + (highDiff * 0.2) + (centroidDiff * 0.2);
          
          // Store the difference score
          diffScores.push({
            time: curr.startTime,
            score: diffScore
          });
        }
        
        // Calculate adaptive threshold based on the distribution of difference scores
        const sortedScores = [...diffScores].sort((a, b) => b.score - a.score);
        const adaptiveThreshold = sortedScores.length > 0 ?
          Math.max(threshold, sortedScores[Math.floor(sortedScores.length * 0.2)].score * 0.7) :
          threshold;
        
        console.log(`Using adaptive threshold: ${adaptiveThreshold} (base: ${threshold})`);
        
        // Find peaks in the difference scores that exceed the threshold
        for (let i = 1; i < diffScores.length - 1; i++) {
          const prev = diffScores[i - 1];
          const curr = diffScores[i];
          const next = diffScores[i + 1];
          
          // Check if this is a local peak and exceeds the threshold
          if (curr.score > adaptiveThreshold &&
              curr.score > prev.score &&
              curr.score > next.score) {
            boundaries.push(curr.time);
          }
        }
        
        // Add the first and last segments if they have high difference scores
        if (diffScores.length > 0) {
          const first = diffScores[0];
          const last = diffScores[diffScores.length - 1];
          
          if (first.score > adaptiveThreshold * 0.8) {
            boundaries.push(first.time);
          }
          
          if (last.score > adaptiveThreshold * 0.8) {
            boundaries.push(last.time);
          }
        }
        
        // Sort boundaries by time
        boundaries.sort((a, b) => a - b);
        
        return boundaries;
      }
    }

    /**
     * SongStructureAnalyzer - Analyzes song structure
     * 
     * This module combines transient detection and spectral analysis
     * to identify different sections of a song (intro, verse, chorus, etc.)
     */


    class SongStructureAnalyzer {
      /**
       * Create a new SongStructureAnalyzer
       * @param {Object} options - Configuration options
       */
      constructor(options = {}) {
        this.transientDetector = new TransientDetector(options.transient);
        this.spectralAnalyzer = new SpectralAnalyzer(options.spectral);
        
        // Section colors with dark teal palette
        this.sectionColors = {
          intro: 'rgba(0, 104, 94, 0.4)',    // dark teal
          verse: 'rgba(0, 134, 124, 0.4)',   // medium teal
          pre: 'rgba(0, 154, 140, 0.4)',     // teal
          chorus: 'rgba(0, 184, 169, 0.4)',  // light teal
          bridge: 'rgba(0, 124, 114, 0.4)',  // dark teal
          outro: 'rgba(0, 104, 94, 0.4)'     // dark teal
        };
      }

      /**
       * Analyze the structure of a song
       * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
       * @returns {Object} Analysis results including sections and transients
       */
      async analyzeStructure(audioBuffer) {
        if (!audioBuffer) {
          throw new Error('No audio data available');
        }

        const duration = audioBuffer.duration;
        
        // Step 1: Detect transients
        const transients = this.transientDetector.detectTransients(audioBuffer);
        
        // Step 2: Analyze transient density to help identify sections
        const transientDensity = this.transientDetector.analyzeTransientDensity(
          transients, 
          duration, 
          5 // 5-second segments
        );
        
        // Step 3: Perform spectral analysis
        const spectralData = this.spectralAnalyzer.analyzeSpectrum(audioBuffer);
        
        // Step 4: Find potential section boundaries
        const potentialBoundaries = this.spectralAnalyzer.findSectionBoundaries(spectralData);
        
        // Step 5: Combine all analyses to determine song structure
        const sections = this.determineSongStructure(
          duration, 
          transientDensity, 
          spectralData, 
          potentialBoundaries
        );
        
        return {
          duration,
          transients,
          transientDensity,
          spectralData,
          potentialBoundaries,
          sections
        };
      }

      /**
       * Determine song structure based on analysis data
       * @param {number} duration - Song duration in seconds
       * @param {Array<Object>} transientDensity - Transient density analysis
       * @param {Array<Object>} spectralData - Spectral analysis data
       * @param {Array<number>} potentialBoundaries - Potential section boundaries
       * @returns {Array<Object>} Song sections
       */
      determineSongStructure(duration, transientDensity, spectralData, potentialBoundaries) {
        // If we don't have enough data for a good analysis, fall back to time-based structure
        if (!potentialBoundaries.length || potentialBoundaries.length < 2) {
          return this.createTimeBasedStructure(duration);
        }
        
        console.log('Original potential boundaries:', potentialBoundaries);
        
        // Ensure we don't exceed the actual song duration
        potentialBoundaries = potentialBoundaries.filter(boundary => boundary <= duration);
        
        // Add important structural points based on typical song structure
        // Most songs have significant changes around these percentages of total duration
        const structuralPoints = [
          0,                  // Start
          duration * 0.1,     // Intro typically ends around 10%
          duration * 0.25,    // First verse typically ends around 25%
          duration * 0.4,     // First chorus typically ends around 40%
          duration * 0.6,     // Second verse typically ends around 60%
          duration * 0.75,    // Bridge or second chorus typically around 75%
          duration            // End
        ];
        
        // Combine structural points with detected boundaries
        let combinedBoundaries = [...potentialBoundaries, ...structuralPoints];
        
        // Sort and remove duplicates
        combinedBoundaries = [...new Set(combinedBoundaries)].sort((a, b) => a - b);
        
        console.log('Combined boundaries:', combinedBoundaries);
        
        // Filter boundaries to remove ones that are too close together
        const minSectionLength = Math.min(10, duration * 0.05); // Minimum section length in seconds (at least 5% of total duration)
        const filteredBoundaries = [0]; // Always start at 0
        
        for (let i = 1; i < combinedBoundaries.length; i++) {
          const boundary = combinedBoundaries[i];
          
          // Check if this boundary is far enough from the last one we added
          if (boundary - filteredBoundaries[filteredBoundaries.length - 1] >= minSectionLength) {
            filteredBoundaries.push(boundary);
          }
        }
        
        // Ensure the last boundary is exactly at the song duration
        if (filteredBoundaries[filteredBoundaries.length - 1] !== duration) {
          // If the last boundary is close to the duration, adjust it
          if (Math.abs(filteredBoundaries[filteredBoundaries.length - 1] - duration) < minSectionLength) {
            filteredBoundaries[filteredBoundaries.length - 1] = duration;
          } else {
            // Otherwise add the duration as the final boundary
            filteredBoundaries.push(duration);
          }
        }
        
        console.log('Filtered boundaries:', filteredBoundaries);
        
        // Now classify each section based on its characteristics
        const sections = [];
        
        for (let i = 0; i < filteredBoundaries.length - 1; i++) {
          const start = filteredBoundaries[i];
          const end = filteredBoundaries[i + 1];
          
          // Analyze this section's characteristics
          const sectionType = this.classifySection(
            start, 
            end, 
            i, 
            filteredBoundaries.length - 1,
            transientDensity, 
            spectralData
          );
          
          sections.push({
            id: `section-${sectionType}-${i}`,
            name: this.formatSectionName(sectionType, i),
            start,
            end,
            color: this.sectionColors[sectionType] || this.sectionColors.verse
          });
        }
        
        return sections;
      }

      /**
       * Classify a section based on its characteristics
       * @param {number} start - Section start time
       * @param {number} end - Section end time
       * @param {number} index - Section index
       * @param {number} totalSections - Total number of sections
       * @param {Array<Object>} transientDensity - Transient density analysis
       * @param {Array<Object>} spectralData - Spectral analysis data
       * @returns {string} Section type (intro, verse, chorus, etc.)
       */
      classifySection(start, end, index, totalSections, transientDensity, spectralData) {
        // Get relevant transient density segments for this section
        const relevantDensity = transientDensity.filter(
          segment => segment.start >= start && segment.end <= end
        );
        
        // Get relevant spectral data for this section
        const relevantSpectral = spectralData.filter(
          data => data.startTime >= start && data.endTime <= end
        );
        
        // Calculate average characteristics for this section
        relevantDensity.reduce(
          (sum, segment) => sum + segment.density, 0
        ) / (relevantDensity.length || 1);
        
        relevantSpectral.reduce(
          (sum, data) => sum + data.lowEnergy, 0
        ) / (relevantSpectral.length || 1);
        
        const avgMidEnergy = relevantSpectral.reduce(
          (sum, data) => sum + data.midEnergy, 0
        ) / (relevantSpectral.length || 1);
        
        const avgHighEnergy = relevantSpectral.reduce(
          (sum, data) => sum + data.highEnergy, 0
        ) / (relevantSpectral.length || 1);
        
        const avgTotalEnergy = relevantSpectral.reduce(
          (sum, data) => sum + data.totalEnergy, 0
        ) / (relevantSpectral.length || 1);
        
        // Classification logic based on position and characteristics
        
        // Intro is typically the first section
        if (index === 0) {
          return 'intro';
        }
        
        // Outro is typically the last section
        if (index === totalSections - 1) {
          return 'outro';
        }
        
        // Typical song structure patterns
        const normalizedPosition = index / (totalSections - 1);
        
        // Chorus positions in typical songs (after intro, after verse, after bridge)
        if ((normalizedPosition > 0.2 && normalizedPosition < 0.3) ||
            (normalizedPosition > 0.5 && normalizedPosition < 0.6) ||
            (normalizedPosition > 0.8 && normalizedPosition < 0.9)) {
          
          // Chorus typically has higher energy, especially in mid and high frequencies
          if (avgTotalEnergy > 0.4 || avgMidEnergy > 0.3 || avgHighEnergy > 0.2) {
            return 'chorus';
          }
        }
        
        // Bridge often in the latter half of the song
        if (normalizedPosition > 0.6 && normalizedPosition < 0.8) {
          return 'bridge';
        }
        
        // Pre-chorus often comes before chorus
        if ((index + 1 < totalSections) &&
            ((normalizedPosition > 0.15 && normalizedPosition < 0.25) ||
             (normalizedPosition > 0.45 && normalizedPosition < 0.55))) {
          return 'pre';
        }
        
        // Default to verse
        return 'verse';
      }

      /**
       * Format a section name based on type and index
       * @param {string} type - Section type
       * @param {number} index - Section index
       * @returns {string} Formatted section name
       */
      formatSectionName(type, index) {
        // Track counts of each section type
        if (!this._sectionCounts) {
          this._sectionCounts = {
            intro: 0,
            verse: 0,
            pre: 0,
            chorus: 0,
            bridge: 0,
            outro: 0
          };
        }
        
        // Increment count for this type
        this._sectionCounts[type]++;
        
        // Special cases that don't need numbers
        if (type === 'intro' || type === 'outro' || type === 'bridge') {
          return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        // Add number to other section types
        return `${type.charAt(0).toUpperCase() + type.slice(1)} ${this._sectionCounts[type]}`;
      }

      /**
       * Create a time-based song structure when analysis is insufficient
       * @param {number} duration - Song duration in seconds
       * @returns {Array<Object>} Song sections
       */
      createTimeBasedStructure(duration) {
        const sections = [];
        let currentTime = 0;
        
        // Calculate section lengths based on total duration
        let introLength, verseLength, preChorusLength, chorusLength, bridgeLength, outroLength;
        
        // Adjust section lengths based on total duration
        if (duration <= 60) { // Short track (< 1 min)
          introLength = duration * 0.1;
          outroLength = duration * 0.1;
          // No bridge for short tracks
          bridgeLength = 0;
          
          // Split remaining time between verse and chorus
          const remainingTime = duration - (introLength + outroLength);
          verseLength = remainingTime * 0.6;
          chorusLength = remainingTime * 0.4;
          preChorusLength = 0;
        } 
        else if (duration <= 180) { // Medium track (1-3 min)
          introLength = duration * 0.1;
          outroLength = duration * 0.1;
          bridgeLength = duration * 0.1;
          preChorusLength = duration * 0.1;
          
          // Split remaining time between verse and chorus
          const remainingTime = duration - (introLength + outroLength + bridgeLength + preChorusLength);
          verseLength = remainingTime * 0.6;
          chorusLength = remainingTime * 0.4;
        } 
        else { // Long track (> 3 min)
          introLength = duration * 0.08;
          outroLength = duration * 0.08;
          bridgeLength = duration * 0.12;
          preChorusLength = duration * 0.1;
          
          // Split remaining time between verse and chorus
          const remainingTime = duration - (introLength + outroLength + bridgeLength + preChorusLength);
          verseLength = remainingTime * 0.55;
          chorusLength = remainingTime * 0.45;
        }
        
        // Intro
        sections.push({
          id: 'section-intro',
          name: 'Intro',
          start: currentTime,
          end: introLength,
          color: this.sectionColors.intro
        });
        currentTime += introLength;
        
        // First verse
        sections.push({
          id: 'section-verse1',
          name: 'Verse 1',
          start: currentTime,
          end: currentTime + verseLength,
          color: this.sectionColors.verse
        });
        currentTime += verseLength;
        
        // Pre-chorus if we have one
        if (preChorusLength > 0) {
          sections.push({
            id: 'section-pre1',
            name: 'Pre-Chorus',
            start: currentTime,
            end: currentTime + preChorusLength,
            color: this.sectionColors.pre
          });
          currentTime += preChorusLength;
        }
        
        // First chorus
        sections.push({
          id: 'section-chorus1',
          name: 'Chorus 1',
          start: currentTime,
          end: currentTime + chorusLength,
          color: this.sectionColors.chorus
        });
        currentTime += chorusLength;
        
        // Second verse if we have enough time
        if (duration > 90) {
          sections.push({
            id: 'section-verse2',
            name: 'Verse 2',
            start: currentTime,
            end: currentTime + verseLength,
            color: this.sectionColors.verse
          });
          currentTime += verseLength;
          
          // Pre-chorus if we have one
          if (preChorusLength > 0) {
            sections.push({
              id: 'section-pre2',
              name: 'Pre-Chorus',
              start: currentTime,
              end: currentTime + preChorusLength,
              color: this.sectionColors.pre
            });
            currentTime += preChorusLength;
          }
          
          // Second chorus
          sections.push({
            id: 'section-chorus2',
            name: 'Chorus 2',
            start: currentTime,
            end: currentTime + chorusLength,
            color: this.sectionColors.chorus
          });
          currentTime += chorusLength;
        }
        
        // Bridge if we have enough time
        if (bridgeLength > 0) {
          sections.push({
            id: 'section-bridge',
            name: 'Bridge',
            start: currentTime,
            end: currentTime + bridgeLength,
            color: this.sectionColors.bridge
          });
          currentTime += bridgeLength;
          
          // Final chorus after bridge
          sections.push({
            id: 'section-chorus3',
            name: 'Chorus 3',
            start: currentTime,
            end: currentTime + chorusLength,
            color: this.sectionColors.chorus
          });
          currentTime += chorusLength;
        }
        
        // Outro
        if (currentTime < duration) {
          sections.push({
            id: 'section-outro',
            name: 'Outro',
            start: currentTime,
            end: duration,
            color: this.sectionColors.outro
          });
        }
        
        return sections;
      }
    }

    /**
     * BPMDetector - Detects beats per minute (tempo) of audio
     * 
     * This module analyzes audio data to find the tempo using
     * various techniques including onset detection and autocorrelation.
     */

    class BPMDetector {
      /**
       * Create a new BPMDetector
       * @param {Object} options - Configuration options
       * @param {number} options.minBPM - Minimum BPM to detect (default: 60)
       * @param {number} options.maxBPM - Maximum BPM to detect (default: 200)
       * @param {number} options.sensitivity - Detection sensitivity (0-100, default: 70)
       */
      constructor(options = {}) {
        this.minBPM = options.minBPM ?? 60;
        this.maxBPM = options.maxBPM ?? 200;
        this.sensitivity = options.sensitivity ?? 70;
      }

      /**
       * Detect BPM of audio data
       * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
       * @returns {Object} BPM analysis results
       */
      detectBPM(audioBuffer) {
        if (!audioBuffer) {
          throw new Error('No audio data available');
        }

        // Get audio data from the first channel
        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Step 1: Find onsets (sudden increases in amplitude)
        const onsets = this.findOnsets(rawData, sampleRate);
        
        // Step 2: Calculate intervals between onsets
        const intervals = this.calculateIntervals(onsets);
        
        // Step 3: Find the most common interval (tempo)
        const bpm = this.findTempo(intervals, sampleRate);
        
        // Step 4: Generate beat positions based on the detected tempo
        const beats = this.generateBeats(bpm, audioBuffer.duration);
        
        return {
          bpm,
          confidence: this.calculateConfidence(intervals, bpm, sampleRate),
          beats,
          onsets
        };
      }

      /**
       * Find onsets (sudden increases in amplitude) in audio data
       * @param {Float32Array} data - Audio data
       * @param {number} sampleRate - Sample rate of the audio
       * @returns {Array<number>} Array of onset positions in seconds
       */
      findOnsets(data, sampleRate) {
        const onsets = [];
        const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
        const hopSize = Math.floor(windowSize / 2); // 50% overlap
        
        // Sensitivity factor (higher value = less sensitive)
        const sensitivityFactor = 1 - (this.sensitivity / 100);
        let energyHistory = new Array(8).fill(0);
        
        // Step through audio data
        for (let i = 0; i < data.length - windowSize; i += hopSize) {
          // Calculate energy (sum of squared amplitudes) for this window
          let energy = 0;
          for (let j = 0; j < windowSize; j++) {
            energy += data[i + j] * data[i + j];
          }
          energy = Math.sqrt(energy / windowSize);
          
          // Calculate local average energy from history
          const avgEnergy = energyHistory.reduce((sum, e) => sum + e, 0) / energyHistory.length;
          
          // Detect sudden increase in energy
          if (energy > avgEnergy * (1.5 + sensitivityFactor) && energy > 0.01) {
            // Convert sample position to seconds
            const time = i / sampleRate;
            onsets.push(time);
            
            // Skip forward to avoid detecting the same onset multiple times
            i += windowSize;
          }
          
          // Update energy history
          energyHistory.shift();
          energyHistory.push(energy);
        }
        
        return onsets;
      }

      /**
       * Calculate intervals between consecutive onsets
       * @param {Array<number>} onsets - Array of onset positions in seconds
       * @returns {Array<number>} Array of intervals in seconds
       */
      calculateIntervals(onsets) {
        const intervals = [];
        
        for (let i = 1; i < onsets.length; i++) {
          const interval = onsets[i] - onsets[i - 1];
          intervals.push(interval);
        }
        
        return intervals;
      }

      /**
       * Find the tempo based on onset intervals
       * @param {Array<number>} intervals - Array of intervals in seconds
       * @param {number} sampleRate - Sample rate of the audio
       * @returns {number} Detected tempo in BPM
       */
      findTempo(intervals, sampleRate) {
        if (intervals.length === 0) {
          return 120; // Default to 120 BPM if no intervals
        }
        
        // Convert intervals to BPM values
        const bpmValues = intervals.map(interval => 60 / interval);
        
        // Filter out unreasonable BPM values
        const filteredBPM = bpmValues.filter(bpm =>
          bpm >= this.minBPM && bpm <= this.maxBPM
        );
        
        if (filteredBPM.length === 0) {
          return 120; // Default to 120 BPM if no valid BPM values
        }
        
        // Use a histogram approach for more accurate BPM detection
        const histogram = this.createBPMHistogram(filteredBPM);
        
        // Find peaks in the histogram
        const peaks = this.findHistogramPeaks(histogram);
        
        // If we have peaks, use the highest one
        if (peaks.length > 0) {
          // Sort peaks by count (descending)
          peaks.sort((a, b) => b.count - a.count);
          
          // Check if we have a strong peak at 120-125 BPM (common in many songs)
          const commonBpmPeak = peaks.find(peak =>
            peak.bpm >= 120 && peak.bpm <= 125 && peak.count > peaks[0].count * 0.8
          );
          
          if (commonBpmPeak) {
            return commonBpmPeak.bpm;
          }
          
          // Use the highest peak
          return peaks[0].bpm;
        }
        
        // Fallback to the old method if histogram approach fails
        // Group similar BPM values
        const bpmGroups = this.groupSimilarValues(filteredBPM, 1.0);
        
        // Find the largest group
        let largestGroup = [];
        let largestCount = 0;
        
        for (const group of bpmGroups) {
          if (group.length > largestCount) {
            largestCount = group.length;
            largestGroup = group;
          }
        }
        
        // Calculate the average BPM of the largest group
        const avgBPM = largestGroup.reduce((sum, bpm) => sum + bpm, 0) / largestGroup.length;
        
        // Round to nearest integer
        return Math.round(avgBPM);
      }
      
      /**
       * Create a histogram of BPM values
       * @param {Array<number>} bpmValues - Array of BPM values
       * @returns {Object} Histogram of BPM values
       */
      createBPMHistogram(bpmValues) {
        const histogram = {};
        const binSize = 1; // 1 BPM per bin
        
        // Create histogram
        for (const bpm of bpmValues) {
          // Round to nearest bin
          const bin = Math.round(bpm / binSize) * binSize;
          
          if (!histogram[bin]) {
            histogram[bin] = 0;
          }
          
          histogram[bin]++;
        }
        
        return histogram;
      }
      
      /**
       * Find peaks in the BPM histogram
       * @param {Object} histogram - Histogram of BPM values
       * @returns {Array<Object>} Array of peaks
       */
      findHistogramPeaks(histogram) {
        const peaks = [];
        const bins = Object.keys(histogram).map(Number).sort((a, b) => a - b);
        
        // Find local maxima
        for (let i = 1; i < bins.length - 1; i++) {
          const bin = bins[i];
          const count = histogram[bin];
          const prevCount = histogram[bins[i - 1]];
          const nextCount = histogram[bins[i + 1]];
          
          // Check if this is a local maximum
          if (count > prevCount && count > nextCount) {
            peaks.push({
              bpm: bin,
              count: count
            });
          }
        }
        
        // Also check first and last bins
        if (bins.length > 0) {
          const firstBin = bins[0];
          if (histogram[firstBin] > histogram[bins[1]]) {
            peaks.push({
              bpm: firstBin,
              count: histogram[firstBin]
            });
          }
          
          const lastBin = bins[bins.length - 1];
          if (histogram[lastBin] > histogram[bins[bins.length - 2]]) {
            peaks.push({
              bpm: lastBin,
              count: histogram[lastBin]
            });
          }
        }
        
        return peaks;
      }

      /**
       * Group similar values together
       * @param {Array<number>} values - Array of values to group
       * @param {number} tolerance - Tolerance for grouping (percentage)
       * @returns {Array<Array<number>>} Array of groups
       */
      groupSimilarValues(values, tolerance) {
        const groups = [];
        const sortedValues = [...values].sort((a, b) => a - b);
        
        let currentGroup = [sortedValues[0]];
        
        for (let i = 1; i < sortedValues.length; i++) {
          const currentValue = sortedValues[i];
          const prevValue = sortedValues[i - 1];
          
          // If the current value is within tolerance of the previous value, add to current group
          if (currentValue <= prevValue * (1 + tolerance) && 
              currentValue >= prevValue * (1 - tolerance)) {
            currentGroup.push(currentValue);
          } else {
            // Otherwise, start a new group
            groups.push(currentGroup);
            currentGroup = [currentValue];
          }
        }
        
        // Add the last group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        
        return groups;
      }

      /**
       * Calculate confidence in the BPM detection
       * @param {Array<number>} intervals - Array of intervals in seconds
       * @param {number} bpm - Detected BPM
       * @param {number} sampleRate - Sample rate of the audio
       * @returns {number} Confidence value (0-1)
       */
      calculateConfidence(intervals, bpm, sampleRate) {
        if (intervals.length === 0) {
          return 0;
        }
        
        // Expected interval for the detected BPM
        const expectedInterval = 60 / bpm;
        
        // Count how many intervals are close to the expected interval
        let matchCount = 0;
        
        for (const interval of intervals) {
          // Check if this interval is close to the expected interval or its multiples/divisions
          if (this.isCloseToMultiple(interval, expectedInterval, 0.1)) {
            matchCount++;
          }
        }
        
        // Calculate confidence as the percentage of matching intervals
        return matchCount / intervals.length;
      }

      /**
       * Check if a value is close to a multiple or division of another value
       * @param {number} value - Value to check
       * @param {number} base - Base value
       * @param {number} tolerance - Tolerance (percentage)
       * @returns {boolean} True if close to a multiple or division
       */
      isCloseToMultiple(value, base, tolerance) {
        // Check multiples (1x, 2x, 3x, 4x)
        for (let i = 1; i <= 4; i++) {
          const multiple = base * i;
          if (value >= multiple * (1 - tolerance) && 
              value <= multiple * (1 + tolerance)) {
            return true;
          }
        }
        
        // Check divisions (1/2, 1/3, 1/4)
        for (let i = 2; i <= 4; i++) {
          const division = base / i;
          if (value >= division * (1 - tolerance) && 
              value <= division * (1 + tolerance)) {
            return true;
          }
        }
        
        return false;
      }

      /**
       * Generate beat positions based on the detected tempo
       * @param {number} bpm - Detected BPM
       * @param {number} duration - Duration of the audio in seconds
       * @returns {Array<number>} Array of beat positions in seconds
       */
      generateBeats(bpm, duration) {
        const beatInterval = 60 / bpm; // Time between beats in seconds
        const beats = [];
        
        // Generate beats starting from 0
        for (let time = 0; time < duration; time += beatInterval) {
          beats.push(time);
        }
        
        return beats;
      }
    }

    /**
     * KeyDetector - Detects musical key of audio
     * 
     * This module analyzes audio data to determine the musical key
     * using chromagram analysis and key correlation.
     */

    class KeyDetector {
      /**
       * Create a new KeyDetector
       * @param {Object} options - Configuration options
       */
      constructor(options = {}) {
        // Define key profiles (Krumhansl-Kessler profiles)
        // These represent the relative importance of each pitch class in a key
        this.majorProfiles = {
          'C': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
          'C#/Db': [2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29],
          'D': [2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66],
          'D#/Eb': [3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39],
          'E': [2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19],
          'F': [5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52],
          'F#/Gb': [2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09],
          'G': [4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38],
          'G#/Ab': [4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33],
          'A': [2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48],
          'A#/Bb': [3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23],
          'B': [2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35]
        };

        this.minorProfiles = {
          'C': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
          'C#/Db': [3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34],
          'D': [3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69],
          'D#/Eb': [2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98],
          'E': [3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75],
          'F': [4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54],
          'F#/Gb': [2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53],
          'G': [3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60],
          'G#/Ab': [2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38],
          'A': [5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52],
          'A#/Bb': [3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68],
          'B': [2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33]
        };

        // Pitch class names (for reference)
        this.pitchClasses = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
      }

      /**
       * Detect the musical key of audio data
       * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
       * @returns {Object} Key analysis results
       */
      detectKey(audioBuffer) {
        if (!audioBuffer) {
          throw new Error('No audio data available');
        }

        try {
          // Get audio data from the first channel
          const rawData = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          
          // Step 1: Compute the chromagram (pitch class profile)
          const chromagram = this.computeChromagram(rawData, sampleRate);
          
          // Step 2: Correlate the chromagram with key profiles
          const keyCorrelations = this.correlateWithKeyProfiles(chromagram);
          
          // Step 3: Find the key with the highest correlation
          const detectedKey = this.findBestKey(keyCorrelations);
          
          // For debugging
          console.log(`Detected key: ${detectedKey.key} ${detectedKey.mode} (correlation: ${detectedKey.correlation.toFixed(3)})`);
          
          // Fallback to C major if we couldn't detect a key properly
          if (!detectedKey.key || !detectedKey.mode) {
            console.warn("Key detection failed, using fallback");
            return {
              key: "C",
              mode: "major",
              confidence: 0.5,
              correlations: []
            };
          }
          
          return {
            key: detectedKey.key,
            mode: detectedKey.mode, // 'major' or 'minor'
            confidence: detectedKey.correlation,
            correlations: keyCorrelations
          };
        } catch (err) {
          console.error("Error in key detection:", err);
          // Return a fallback value
          return {
            key: "C",
            mode: "major",
            confidence: 0.5,
            correlations: []
          };
        }
      }

      /**
       * Compute the chromagram (pitch class profile) of audio data
       * @param {Float32Array} data - Audio data
       * @param {number} sampleRate - Sample rate of the audio
       * @returns {Array<number>} Chromagram (12 pitch classes)
       */
      computeChromagram(data, sampleRate) {
        // Initialize chromagram (12 pitch classes)
        const chromagram = new Array(12).fill(0);
        
        try {
          // Use a simpler approach that doesn't rely on manipulating currentTime
          // Analyze the entire buffer at once instead of in chunks
          
          // Create a temporary offline context for analysis
          const offlineCtx = new OfflineAudioContext(1, data.length, sampleRate);
          const audioBuffer = offlineCtx.createBuffer(1, data.length, sampleRate);
          audioBuffer.getChannelData(0).set(data);
          
          // Create analyzer node
          const analyzer = offlineCtx.createAnalyser();
          analyzer.fftSize = 4096;
          analyzer.smoothingTimeConstant = 0;
          
          // Create source node
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(analyzer);
          
          // Get frequency data
          const frequencyData = new Float32Array(analyzer.frequencyBinCount);
          analyzer.getFloatFrequencyData(frequencyData);
          
          // Process frequency data
          for (let j = 0; j < frequencyData.length; j++) {
            // Convert frequency bin to Hz
            const frequency = j * sampleRate / analyzer.fftSize;
            
            // Skip very low and very high frequencies
            if (frequency < 20 || frequency > 8000) continue;
            
            // Convert frequency to pitch class (0-11)
            const pitchClass = this.frequencyToPitchClass(frequency);
            
            // Add energy to the corresponding pitch class
            // Convert from dB to linear scale and normalize
            const magnitude = Math.pow(10, frequencyData[j] / 20);
            if (magnitude > 0 && !isNaN(magnitude)) {
              chromagram[pitchClass] += magnitude;
            }
          }
          
          // Alternative approach: use Web Audio API's built-in rendering
          offlineCtx.startRendering().then((renderedBuffer) => {
            console.log("Audio processing completed");
          }).catch(err => {
            console.error("Error rendering audio:", err);
          });
        } catch (err) {
          console.error("Error in chromagram computation:", err);
        }
        
        // Normalize the chromagram
        const sum = chromagram.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          for (let i = 0; i < chromagram.length; i++) {
            chromagram[i] /= sum;
          }
        }
        
        return chromagram;
      }

      /**
       * Convert frequency to pitch class (0-11)
       * @param {number} frequency - Frequency in Hz
       * @returns {number} Pitch class (0-11, where 0 is C, 1 is C#/Db, etc.)
       */
      frequencyToPitchClass(frequency) {
        // A4 = 440 Hz = pitch class 9 (A)
        // 12 semitones per octave
        const semitones = 12 * Math.log2(frequency / 440);
        const pitchClass = Math.round(semitones) % 12;
        return (pitchClass + 12) % 12; // Ensure positive value
      }

      /**
       * Correlate the chromagram with key profiles
       * @param {Array<number>} chromagram - Chromagram (12 pitch classes)
       * @returns {Array<Object>} Correlations with each key
       */
      correlateWithKeyProfiles(chromagram) {
        const correlations = [];
        
        // Correlate with major keys
        for (const key in this.majorProfiles) {
          const profile = this.majorProfiles[key];
          const correlation = this.correlate(chromagram, profile);
          correlations.push({
            key,
            mode: 'major',
            correlation
          });
        }
        
        // Correlate with minor keys
        for (const key in this.minorProfiles) {
          const profile = this.minorProfiles[key];
          const correlation = this.correlate(chromagram, profile);
          correlations.push({
            key,
            mode: 'minor',
            correlation
          });
        }
        
        // Sort by correlation (highest first)
        correlations.sort((a, b) => b.correlation - a.correlation);
        
        return correlations;
      }

      /**
       * Calculate correlation between two vectors
       * @param {Array<number>} a - First vector
       * @param {Array<number>} b - Second vector
       * @returns {number} Correlation coefficient
       */
      correlate(a, b) {
        let sum_a = 0;
        let sum_b = 0;
        let sum_ab = 0;
        let sum_a2 = 0;
        let sum_b2 = 0;
        
        for (let i = 0; i < a.length; i++) {
          sum_a += a[i];
          sum_b += b[i];
          sum_ab += a[i] * b[i];
          sum_a2 += a[i] * a[i];
          sum_b2 += b[i] * b[i];
        }
        
        const n = a.length;
        const numerator = n * sum_ab - sum_a * sum_b;
        const denominator = Math.sqrt((n * sum_a2 - sum_a * sum_a) * (n * sum_b2 - sum_b * sum_b));
        
        if (denominator === 0) return 0;
        
        return numerator / denominator;
      }

      /**
       * Find the key with the highest correlation
       * @param {Array<Object>} correlations - Correlations with each key
       * @returns {Object} Best matching key
       */
      findBestKey(correlations) {
        return correlations[0];
      }
    }

    /* src\ExportDialog.svelte generated by Svelte v3.59.2 */
    const file$4 = "src\\ExportDialog.svelte";

    // (210:0) {#if show}
    function create_if_block$2(ctx) {
    	let div7;
    	let div6;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let t3;
    	let div4;
    	let t4;
    	let div1;
    	let label0;
    	let t6;
    	let input;
    	let t7;
    	let div2;
    	let label1;
    	let t9;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t13;
    	let div3;
    	let label2;
    	let t15;
    	let select1;
    	let option3;
    	let option4;
    	let option5;
    	let t19;
    	let div5;
    	let button1;
    	let t21;
    	let button2;
    	let mounted;
    	let dispose;
    	let if_block = /*region*/ ctx[1] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Export Region";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "×";
    			t3 = space();
    			div4 = element("div");
    			if (if_block) if_block.c();
    			t4 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Export Name";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Format";
    			t9 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "MP3";
    			option1 = element("option");
    			option1.textContent = "WAV";
    			option2 = element("option");
    			option2.textContent = "OGG";
    			t13 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Quality";
    			t15 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "High (320kbps)";
    			option4 = element("option");
    			option4.textContent = "Medium (192kbps)";
    			option5 = element("option");
    			option5.textContent = "Low (128kbps)";
    			t19 = space();
    			div5 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			t21 = space();
    			button2 = element("button");
    			button2.textContent = "Export";
    			attr_dev(h3, "class", "dialog-title svelte-upcbx3");
    			add_location(h3, file$4, 220, 8, 4612);
    			attr_dev(button0, "class", "close-button svelte-upcbx3");
    			add_location(button0, file$4, 221, 8, 4665);
    			attr_dev(div0, "class", "dialog-header svelte-upcbx3");
    			add_location(div0, file$4, 219, 6, 4575);
    			attr_dev(label0, "class", "form-label svelte-upcbx3");
    			attr_dev(label0, "for", "export-name");
    			add_location(label0, file$4, 243, 10, 5565);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "export-name");
    			attr_dev(input, "class", "form-input svelte-upcbx3");
    			attr_dev(input, "placeholder", "Enter a name for the export");
    			add_location(input, file$4, 244, 10, 5640);
    			attr_dev(div1, "class", "form-group svelte-upcbx3");
    			add_location(div1, file$4, 242, 8, 5529);
    			attr_dev(label1, "class", "form-label svelte-upcbx3");
    			attr_dev(label1, "for", "export-format");
    			add_location(label1, file$4, 254, 10, 5916);
    			option0.__value = "mp3";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 256, 12, 6075);
    			option1.__value = "wav";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 257, 12, 6121);
    			option2.__value = "ogg";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 258, 12, 6167);
    			attr_dev(select0, "id", "export-format");
    			attr_dev(select0, "class", "form-select svelte-upcbx3");
    			if (/*exportFormat*/ ctx[2] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[10].call(select0));
    			add_location(select0, file$4, 255, 10, 5988);
    			attr_dev(div2, "class", "form-group svelte-upcbx3");
    			add_location(div2, file$4, 253, 8, 5880);
    			attr_dev(label2, "class", "form-label svelte-upcbx3");
    			attr_dev(label2, "for", "export-quality");
    			add_location(label2, file$4, 263, 10, 6292);
    			option3.__value = "high";
    			option3.value = option3.__value;
    			add_location(option3, file$4, 265, 12, 6455);
    			option4.__value = "medium";
    			option4.value = option4.__value;
    			add_location(option4, file$4, 266, 12, 6513);
    			option5.__value = "low";
    			option5.value = option5.__value;
    			add_location(option5, file$4, 267, 12, 6575);
    			attr_dev(select1, "id", "export-quality");
    			attr_dev(select1, "class", "form-select svelte-upcbx3");
    			if (/*exportQuality*/ ctx[3] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[11].call(select1));
    			add_location(select1, file$4, 264, 10, 6366);
    			attr_dev(div3, "class", "form-group svelte-upcbx3");
    			add_location(div3, file$4, 262, 8, 6256);
    			attr_dev(div4, "class", "dialog-content svelte-upcbx3");
    			add_location(div4, file$4, 224, 6, 4757);
    			attr_dev(button1, "class", "button cancel-button svelte-upcbx3");
    			add_location(button1, file$4, 273, 8, 6721);
    			attr_dev(button2, "class", "button export-button svelte-upcbx3");
    			add_location(button2, file$4, 274, 8, 6806);
    			attr_dev(div5, "class", "dialog-footer svelte-upcbx3");
    			add_location(div5, file$4, 272, 6, 6684);
    			attr_dev(div6, "class", "dialog svelte-upcbx3");
    			add_location(div6, file$4, 215, 4, 4489);
    			attr_dev(div7, "class", "dialog-overlay svelte-upcbx3");
    			add_location(div7, file$4, 210, 2, 4384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div6, t3);
    			append_dev(div6, div4);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input);
    			set_input_value(input, /*exportName*/ ctx[4]);
    			append_dev(div4, t7);
    			append_dev(div4, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t9);
    			append_dev(div2, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*exportFormat*/ ctx[2], true);
    			append_dev(div4, t13);
    			append_dev(div4, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t15);
    			append_dev(div3, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			append_dev(select1, option5);
    			select_option(select1, /*exportQuality*/ ctx[3], true);
    			append_dev(div6, t19);
    			append_dev(div6, div5);
    			append_dev(div5, button1);
    			append_dev(div5, t21);
    			append_dev(div5, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*closeDialog*/ ctx[5], false, false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[9]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[10]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[11]),
    					listen_dev(button1, "click", /*closeDialog*/ ctx[5], false, false, false, false),
    					listen_dev(button2, "click", /*handleExport*/ ctx[6], false, false, false, false),
    					listen_dev(div6, "click", stop_propagation(click_handler), false, false, true, false),
    					listen_dev(div7, "click", /*closeDialog*/ ctx[5], false, false, false, false),
    					listen_dev(div7, "keydown", /*handleKeydown*/ ctx[7], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*region*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div4, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*exportName*/ 16 && input.value !== /*exportName*/ ctx[4]) {
    				set_input_value(input, /*exportName*/ ctx[4]);
    			}

    			if (dirty & /*exportFormat*/ 4) {
    				select_option(select0, /*exportFormat*/ ctx[2]);
    			}

    			if (dirty & /*exportQuality*/ 8) {
    				select_option(select1, /*exportQuality*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(210:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (226:8) {#if region}
    function create_if_block_1$1(ctx) {
    	let div3;
    	let div0;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*region*/ ctx[1].start.toFixed(2) + "";
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let span2;
    	let t6;
    	let span3;
    	let t7_value = /*region*/ ctx[1].end.toFixed(2) + "";
    	let t7;
    	let t8;
    	let t9;
    	let div2;
    	let span4;
    	let t11;
    	let span5;
    	let t12_value = (/*region*/ ctx[1].end - /*region*/ ctx[1].start).toFixed(2) + "";
    	let t12;
    	let t13;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Start:";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = text("s");
    			t4 = space();
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "End:";
    			t6 = space();
    			span3 = element("span");
    			t7 = text(t7_value);
    			t8 = text("s");
    			t9 = space();
    			div2 = element("div");
    			span4 = element("span");
    			span4.textContent = "Duration:";
    			t11 = space();
    			span5 = element("span");
    			t12 = text(t12_value);
    			t13 = text("s");
    			attr_dev(span0, "class", "region-info-label svelte-upcbx3");
    			add_location(span0, file$4, 228, 14, 4904);
    			attr_dev(span1, "class", "region-info-value svelte-upcbx3");
    			add_location(span1, file$4, 229, 14, 4965);
    			attr_dev(div0, "class", "region-info-item svelte-upcbx3");
    			add_location(div0, file$4, 227, 12, 4858);
    			attr_dev(span2, "class", "region-info-label svelte-upcbx3");
    			add_location(span2, file$4, 232, 14, 5110);
    			attr_dev(span3, "class", "region-info-value svelte-upcbx3");
    			add_location(span3, file$4, 233, 14, 5169);
    			attr_dev(div1, "class", "region-info-item svelte-upcbx3");
    			add_location(div1, file$4, 231, 12, 5064);
    			attr_dev(span4, "class", "region-info-label svelte-upcbx3");
    			add_location(span4, file$4, 236, 14, 5312);
    			attr_dev(span5, "class", "region-info-value svelte-upcbx3");
    			add_location(span5, file$4, 237, 14, 5376);
    			attr_dev(div2, "class", "region-info-item svelte-upcbx3");
    			add_location(div2, file$4, 235, 12, 5266);
    			attr_dev(div3, "class", "region-info svelte-upcbx3");
    			add_location(div3, file$4, 226, 10, 4819);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, span2);
    			append_dev(div1, t6);
    			append_dev(div1, span3);
    			append_dev(span3, t7);
    			append_dev(span3, t8);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, span4);
    			append_dev(div2, t11);
    			append_dev(div2, span5);
    			append_dev(span5, t12);
    			append_dev(span5, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*region*/ 2 && t2_value !== (t2_value = /*region*/ ctx[1].start.toFixed(2) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*region*/ 2 && t7_value !== (t7_value = /*region*/ ctx[1].end.toFixed(2) + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*region*/ 2 && t12_value !== (t12_value = (/*region*/ ctx[1].end - /*region*/ ctx[1].start).toFixed(2) + "")) set_data_dev(t12, t12_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(226:8) {#if region}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let if_block = /*show*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const click_handler = () => {
    	
    };

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ExportDialog', slots, []);
    	let { show = false } = $$props;
    	let { region = null } = $$props;
    	let { projectName = 'Untitled Project' } = $$props;
    	const dispatch = createEventDispatcher();
    	let exportFormat = 'mp3';
    	let exportQuality = 'high';
    	let exportName = '';

    	function closeDialog() {
    		$$invalidate(0, show = false);
    	}

    	function handleExport() {
    		dispatch('export', {
    			region,
    			format: exportFormat,
    			quality: exportQuality,
    			name: exportName || `export-${Date.now()}`
    		});

    		closeDialog();
    	}

    	function handleKeydown(event) {
    		if (event.key === 'Escape') {
    			closeDialog();
    		}
    	}

    	const writable_props = ['show', 'region', 'projectName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ExportDialog> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		exportName = this.value;
    		(($$invalidate(4, exportName), $$invalidate(1, region)), $$invalidate(8, projectName));
    	}

    	function select0_change_handler() {
    		exportFormat = select_value(this);
    		$$invalidate(2, exportFormat);
    	}

    	function select1_change_handler() {
    		exportQuality = select_value(this);
    		$$invalidate(3, exportQuality);
    	}

    	$$self.$$set = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    		if ('region' in $$props) $$invalidate(1, region = $$props.region);
    		if ('projectName' in $$props) $$invalidate(8, projectName = $$props.projectName);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		show,
    		region,
    		projectName,
    		dispatch,
    		exportFormat,
    		exportQuality,
    		exportName,
    		closeDialog,
    		handleExport,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    		if ('region' in $$props) $$invalidate(1, region = $$props.region);
    		if ('projectName' in $$props) $$invalidate(8, projectName = $$props.projectName);
    		if ('exportFormat' in $$props) $$invalidate(2, exportFormat = $$props.exportFormat);
    		if ('exportQuality' in $$props) $$invalidate(3, exportQuality = $$props.exportQuality);
    		if ('exportName' in $$props) $$invalidate(4, exportName = $$props.exportName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*region, projectName*/ 258) {
    			if (region && region.id) {
    				// Generate a default export name based on project and region
    				$$invalidate(4, exportName = `${projectName.replace(/\s+/g, '-').toLowerCase()}-region-${region.id.substring(0, 6)}`);
    			}
    		}
    	};

    	return [
    		show,
    		region,
    		exportFormat,
    		exportQuality,
    		exportName,
    		closeDialog,
    		handleExport,
    		handleKeydown,
    		projectName,
    		input_input_handler,
    		select0_change_handler,
    		select1_change_handler
    	];
    }

    class ExportDialog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { show: 0, region: 1, projectName: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExportDialog",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get show() {
    		throw new Error("<ExportDialog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ExportDialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get region() {
    		throw new Error("<ExportDialog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set region(value) {
    		throw new Error("<ExportDialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get projectName() {
    		throw new Error("<ExportDialog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set projectName(value) {
    		throw new Error("<ExportDialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\AudioVisualizer.svelte generated by Svelte v3.59.2 */
    const file$3 = "src\\AudioVisualizer.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let canvas_1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas_1 = element("canvas");
    			attr_dev(canvas_1, "width", window.innerWidth);
    			attr_dev(canvas_1, "height", /*height*/ ctx[0]);
    			attr_dev(canvas_1, "class", "svelte-zbi8ub");
    			add_location(canvas_1, file$3, 167, 2, 4047);
    			attr_dev(div, "class", "visualizer-container svelte-zbi8ub");
    			add_location(div, file$3, 166, 0, 4009);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas_1);
    			/*canvas_1_binding*/ ctx[8](canvas_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*height*/ 1) {
    				attr_dev(canvas_1, "height", /*height*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*canvas_1_binding*/ ctx[8](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AudioVisualizer', slots, []);
    	let { audioUrl = null } = $$props;
    	let { height = 80 } = $$props;
    	let { barWidth = 2 } = $$props;
    	let { barGap = 1 } = $$props;
    	let { barColor = '#00b8a9' } = $$props;
    	let canvas;
    	let audioContext;
    	let analyser;
    	let source;
    	let audio;
    	let animationId;
    	let isPlaying = false;

    	onMount(() => {
    		if (!canvas) return;

    		// Initialize audio context
    		audioContext = new (window.AudioContext || window.webkitAudioContext)();

    		analyser = audioContext.createAnalyser();
    		analyser.fftSize = 256;

    		// Set up canvas
    		canvas.getContext('2d');

    		// Load audio if URL is provided
    		if (audioUrl) {
    			loadAudio(audioUrl);
    		}
    	});

    	onDestroy(() => {
    		cancelAnimationFrame(animationId);

    		if (source) {
    			source.disconnect();
    		}

    		if (audio) {
    			audio.pause();
    			$$invalidate(7, audio.src = '', audio);
    		}

    		if (audioContext) {
    			audioContext.close();
    		}
    	});

    	function loadAudio(url) {
    		if (!audioContext || !analyser) return;

    		// Create audio element
    		$$invalidate(7, audio = new Audio());

    		$$invalidate(7, audio.crossOrigin = 'anonymous', audio);
    		$$invalidate(7, audio.src = url, audio);

    		audio.addEventListener('canplay', () => {
    			// Connect audio to analyser
    			$$invalidate(6, source = audioContext.createMediaElementSource(audio));

    			source.connect(analyser);
    			analyser.connect(audioContext.destination);
    		});

    		// Set up play/pause events
    		audio.addEventListener('play', () => {
    			isPlaying = true;
    			visualize();
    		});

    		audio.addEventListener('pause', () => {
    			isPlaying = false;
    			cancelAnimationFrame(animationId);
    		});

    		audio.addEventListener('ended', () => {
    			isPlaying = false;
    			cancelAnimationFrame(animationId);
    		});
    	}

    	function visualize() {
    		if (!canvas || !analyser) return;
    		const ctx = canvas.getContext('2d');
    		const bufferLength = analyser.frequencyBinCount;
    		const dataArray = new Uint8Array(bufferLength);
    		const WIDTH = canvas.width;
    		const HEIGHT = canvas.height;

    		function draw() {
    			animationId = requestAnimationFrame(draw);
    			analyser.getByteFrequencyData(dataArray);
    			ctx.fillStyle = 'rgba(18, 18, 18, 0.2)';
    			ctx.fillRect(0, 0, WIDTH, HEIGHT);
    			const barCount = Math.floor(WIDTH / (barWidth + barGap));
    			const barStep = Math.ceil(bufferLength / barCount);

    			for (let i = 0; i < barCount; i++) {
    				const dataIndex = Math.min(i * barStep, bufferLength - 1);
    				const barHeight = dataArray[dataIndex] / 255 * HEIGHT;
    				const x = i * (barWidth + barGap);
    				const y = HEIGHT - barHeight;

    				// Create gradient for bars
    				const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);

    				gradient.addColorStop(0, barColor);
    				gradient.addColorStop(1, '#ccff00');
    				ctx.fillStyle = gradient;
    				ctx.fillRect(x, y, barWidth, barHeight);
    			}
    		}

    		draw();
    	}

    	// Function used by parent component
    	function togglePlay() {
    		if (!audio) return;

    		if (isPlaying) {
    			audio.pause();
    		} else {
    			// Resume AudioContext if it was suspended
    			if (audioContext.state === 'suspended') {
    				audioContext.resume();
    			}

    			audio.play();
    		}
    	}

    	const writable_props = ['audioUrl', 'height', 'barWidth', 'barGap', 'barColor'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AudioVisualizer> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(1, canvas);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('audioUrl' in $$props) $$invalidate(2, audioUrl = $$props.audioUrl);
    		if ('height' in $$props) $$invalidate(0, height = $$props.height);
    		if ('barWidth' in $$props) $$invalidate(3, barWidth = $$props.barWidth);
    		if ('barGap' in $$props) $$invalidate(4, barGap = $$props.barGap);
    		if ('barColor' in $$props) $$invalidate(5, barColor = $$props.barColor);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		audioUrl,
    		height,
    		barWidth,
    		barGap,
    		barColor,
    		canvas,
    		audioContext,
    		analyser,
    		source,
    		audio,
    		animationId,
    		isPlaying,
    		loadAudio,
    		visualize,
    		togglePlay
    	});

    	$$self.$inject_state = $$props => {
    		if ('audioUrl' in $$props) $$invalidate(2, audioUrl = $$props.audioUrl);
    		if ('height' in $$props) $$invalidate(0, height = $$props.height);
    		if ('barWidth' in $$props) $$invalidate(3, barWidth = $$props.barWidth);
    		if ('barGap' in $$props) $$invalidate(4, barGap = $$props.barGap);
    		if ('barColor' in $$props) $$invalidate(5, barColor = $$props.barColor);
    		if ('canvas' in $$props) $$invalidate(1, canvas = $$props.canvas);
    		if ('audioContext' in $$props) audioContext = $$props.audioContext;
    		if ('analyser' in $$props) analyser = $$props.analyser;
    		if ('source' in $$props) $$invalidate(6, source = $$props.source);
    		if ('audio' in $$props) $$invalidate(7, audio = $$props.audio);
    		if ('animationId' in $$props) animationId = $$props.animationId;
    		if ('isPlaying' in $$props) isPlaying = $$props.isPlaying;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*audioUrl, canvas, source, audio*/ 198) {
    			// Update audio URL when prop changes
    			{
    				if (audioUrl && canvas) {
    					if (source) {
    						source.disconnect();
    					}

    					if (audio) {
    						audio.pause();
    						$$invalidate(7, audio.src = '', audio);
    					}

    					loadAudio(audioUrl);
    				}
    			}
    		}
    	};

    	return [
    		height,
    		canvas,
    		audioUrl,
    		barWidth,
    		barGap,
    		barColor,
    		source,
    		audio,
    		canvas_1_binding
    	];
    }

    class AudioVisualizer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			audioUrl: 2,
    			height: 0,
    			barWidth: 3,
    			barGap: 4,
    			barColor: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AudioVisualizer",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get audioUrl() {
    		throw new Error("<AudioVisualizer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set audioUrl(value) {
    		throw new Error("<AudioVisualizer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<AudioVisualizer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<AudioVisualizer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get barWidth() {
    		throw new Error("<AudioVisualizer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barWidth(value) {
    		throw new Error("<AudioVisualizer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get barGap() {
    		throw new Error("<AudioVisualizer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barGap(value) {
    		throw new Error("<AudioVisualizer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get barColor() {
    		throw new Error("<AudioVisualizer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barColor(value) {
    		throw new Error("<AudioVisualizer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\AudioTimeline.svelte generated by Svelte v3.59.2 */
    const file$2 = "src\\AudioTimeline.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[61] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	return child_ctx;
    }

    // (576:4) {#if bpm || key}
    function create_if_block_3(ctx) {
    	let div;
    	let t;
    	let if_block0 = /*bpm*/ ctx[14] && create_if_block_5(ctx);
    	let if_block1 = /*key*/ ctx[15] && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "analysis-results svelte-14syn3g");
    			add_location(div, file$2, 576, 6, 12933);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t);
    			if (if_block1) if_block1.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*bpm*/ ctx[14]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*key*/ ctx[15]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(576:4) {#if bpm || key}",
    		ctx
    	});

    	return block;
    }

    // (578:8) {#if bpm}
    function create_if_block_5(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*bpm*/ ctx[14]);
    			t1 = text(" BPM");
    			attr_dev(div, "class", "result-badge bpm svelte-14syn3g");
    			add_location(div, file$2, 578, 10, 12994);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*bpm*/ 16384) set_data_dev(t0, /*bpm*/ ctx[14]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(578:8) {#if bpm}",
    		ctx
    	});

    	return block;
    }

    // (581:8) {#if key}
    function create_if_block_4(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*key*/ ctx[15]);
    			attr_dev(div, "class", "result-badge key svelte-14syn3g");
    			add_location(div, file$2, 581, 10, 13085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*key*/ 32768) set_data_dev(t, /*key*/ ctx[15]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(581:8) {#if key}",
    		ctx
    	});

    	return block;
    }

    // (602:6) {#if enableSnapping}
    function create_if_block_2(ctx) {
    	let div0;
    	let label0;
    	let input0;
    	let input0_disabled_value;
    	let t0;
    	let t1;
    	let label1;
    	let input1;
    	let input1_disabled_value;
    	let t2;
    	let t3;
    	let div2;
    	let div1;
    	let span0;
    	let t5;
    	let span1;
    	let t6_value = /*snapThreshold*/ ctx[20].toFixed(2) + "";
    	let t6;
    	let t7;
    	let t8;
    	let input2;
    	let input2_disabled_value;
    	let binding_group;
    	let mounted;
    	let dispose;
    	binding_group = init_binding_group(/*$$binding_groups*/ ctx[45][0]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t0 = text("\r\n            Snap to Transients");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text("\r\n            Snap to Beats");
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "Snap Threshold";
    			t5 = space();
    			span1 = element("span");
    			t6 = text(t6_value);
    			t7 = text("s");
    			t8 = space();
    			input2 = element("input");
    			attr_dev(input0, "type", "radio");
    			input0.__value = true;
    			input0.value = input0.__value;
    			input0.disabled = input0_disabled_value = !/*enableSnapping*/ ctx[21];
    			add_location(input0, file$2, 604, 12, 13643);
    			attr_dev(label0, "class", "radio-label svelte-14syn3g");
    			add_location(label0, file$2, 603, 10, 13602);
    			attr_dev(input1, "type", "radio");
    			input1.__value = false;
    			input1.value = input1.__value;
    			input1.disabled = input1_disabled_value = !/*enableSnapping*/ ctx[21];
    			add_location(input1, file$2, 614, 12, 13918);
    			attr_dev(label1, "class", "radio-label svelte-14syn3g");
    			add_location(label1, file$2, 613, 10, 13877);
    			attr_dev(div0, "class", "radio-group svelte-14syn3g");
    			add_location(div0, file$2, 602, 8, 13565);
    			add_location(span0, file$2, 626, 12, 14263);
    			attr_dev(span1, "class", "control-value svelte-14syn3g");
    			add_location(span1, file$2, 627, 12, 14304);
    			attr_dev(div1, "class", "control-label svelte-14syn3g");
    			add_location(div1, file$2, 625, 10, 14222);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "0.01");
    			attr_dev(input2, "max", "1");
    			attr_dev(input2, "step", "0.01");
    			input2.disabled = input2_disabled_value = !/*enableSnapping*/ ctx[21];
    			attr_dev(input2, "class", "svelte-14syn3g");
    			add_location(input2, file$2, 629, 10, 14396);
    			attr_dev(div2, "class", "control-item svelte-14syn3g");
    			set_style(div2, "width", "200px");
    			add_location(div2, file$2, 624, 8, 14162);
    			binding_group.p(input0, input1);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === /*snapToTransients*/ ctx[22];
    			append_dev(label0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === /*snapToTransients*/ ctx[22];
    			append_dev(label1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t5);
    			append_dev(div1, span1);
    			append_dev(span1, t6);
    			append_dev(span1, t7);
    			append_dev(div2, t8);
    			append_dev(div2, input2);
    			set_input_value(input2, /*snapThreshold*/ ctx[20]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[44]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[46]),
    					listen_dev(input2, "change", /*input2_change_input_handler_1*/ ctx[47]),
    					listen_dev(input2, "input", /*input2_change_input_handler_1*/ ctx[47])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*enableSnapping*/ 2097152 && input0_disabled_value !== (input0_disabled_value = !/*enableSnapping*/ ctx[21])) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty[0] & /*snapToTransients*/ 4194304) {
    				input0.checked = input0.__value === /*snapToTransients*/ ctx[22];
    			}

    			if (dirty[0] & /*enableSnapping*/ 2097152 && input1_disabled_value !== (input1_disabled_value = !/*enableSnapping*/ ctx[21])) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty[0] & /*snapToTransients*/ 4194304) {
    				input1.checked = input1.__value === /*snapToTransients*/ ctx[22];
    			}

    			if (dirty[0] & /*snapThreshold*/ 1048576 && t6_value !== (t6_value = /*snapThreshold*/ ctx[20].toFixed(2) + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*enableSnapping*/ 2097152 && input2_disabled_value !== (input2_disabled_value = !/*enableSnapping*/ ctx[21])) {
    				prop_dev(input2, "disabled", input2_disabled_value);
    			}

    			if (dirty[0] & /*snapThreshold*/ 1048576) {
    				set_input_value(input2, /*snapThreshold*/ ctx[20]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    			binding_group.r();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(602:6) {#if enableSnapping}",
    		ctx
    	});

    	return block;
    }

    // (665:4) {#if customRegions.length > 0}
    function create_if_block_1(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let each_value_1 = /*customRegions*/ ctx[8];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Custom Regions";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "section-group-title svelte-14syn3g");
    			add_location(div0, file$2, 666, 8, 15348);
    			attr_dev(div1, "class", "section-group svelte-14syn3g");
    			add_location(div1, file$2, 665, 6, 15311);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*customRegions, exportRegion*/ 1073742080 | dirty[1] & /*seekToRegion, playRegion*/ 6) {
    				each_value_1 = /*customRegions*/ ctx[8];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(665:4) {#if customRegions.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (668:8) {#each customRegions as region}
    function create_each_block_1(ctx) {
    	let button2;
    	let span;
    	let t0_value = /*region*/ ctx[64].name + "";
    	let t0;
    	let t1;
    	let div;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[48](/*region*/ ctx[64]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[49](/*region*/ ctx[64]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[50](/*region*/ ctx[64]);
    	}

    	const block = {
    		c: function create() {
    			button2 = element("button");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "Play";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Export";
    			t5 = space();
    			add_location(span, file$2, 673, 12, 15630);
    			attr_dev(button0, "class", "button svelte-14syn3g");
    			add_location(button0, file$2, 675, 14, 15712);
    			attr_dev(button1, "class", "button svelte-14syn3g");
    			add_location(button1, file$2, 681, 14, 15902);
    			attr_dev(div, "class", "button-group svelte-14syn3g");
    			add_location(div, file$2, 674, 12, 15670);
    			attr_dev(button2, "class", "section-button svelte-14syn3g");
    			set_style(button2, "background-color", /*region*/ ctx[64].color);
    			add_location(button2, file$2, 668, 10, 15454);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button2, anchor);
    			append_dev(button2, span);
    			append_dev(span, t0);
    			append_dev(button2, t1);
    			append_dev(button2, div);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			append_dev(button2, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", stop_propagation(click_handler), false, false, true, false),
    					listen_dev(button1, "click", stop_propagation(click_handler_1), false, false, true, false),
    					listen_dev(button2, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*customRegions*/ 256 && t0_value !== (t0_value = /*region*/ ctx[64].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*customRegions*/ 256) {
    				set_style(button2, "background-color", /*region*/ ctx[64].color);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(668:8) {#each customRegions as region}",
    		ctx
    	});

    	return block;
    }

    // (694:4) {#if sections.length > 0}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let each_value = /*sections*/ ctx[7];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Song Structure";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "section-group-title svelte-14syn3g");
    			add_location(div0, file$2, 695, 8, 16241);
    			attr_dev(div1, "class", "section-group svelte-14syn3g");
    			add_location(div1, file$2, 694, 6, 16204);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*sections*/ 128 | dirty[1] & /*seekToRegion*/ 2) {
    				each_value = /*sections*/ ctx[7];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(694:4) {#if sections.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (697:8) {#each sections as section}
    function create_each_block$1(ctx) {
    	let button;
    	let span0;
    	let t0_value = /*section*/ ctx[61].name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = formatTime(/*section*/ ctx[61].start) + "";
    	let t2;
    	let t3;
    	let t4_value = formatTime(/*section*/ ctx[61].end) + "";
    	let t4;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[51](/*section*/ ctx[61]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(span0, file$2, 702, 12, 16521);
    			attr_dev(span1, "class", "section-time svelte-14syn3g");
    			add_location(span1, file$2, 703, 12, 16562);
    			attr_dev(button, "class", "section-button svelte-14syn3g");
    			set_style(button, "background-color", /*section*/ ctx[61].color);
    			add_location(button, file$2, 697, 10, 16343);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span0);
    			append_dev(span0, t0);
    			append_dev(button, t1);
    			append_dev(button, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(button, t5);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*sections*/ 128 && t0_value !== (t0_value = /*section*/ ctx[61].name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*sections*/ 128 && t2_value !== (t2_value = formatTime(/*section*/ ctx[61].start) + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*sections*/ 128 && t4_value !== (t4_value = formatTime(/*section*/ ctx[61].end) + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*sections*/ 128) {
    				set_style(button, "background-color", /*section*/ ctx[61].color);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(697:8) {#each sections as section}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div26;
    	let div3;
    	let div0;
    	let button0;
    	let t0_value = (/*isPlaying*/ ctx[2] ? 'Pause' : 'Play') + "";
    	let t0;
    	let t1;
    	let span0;
    	let t2_value = formatTime(/*currentTime*/ ctx[3]) + "";
    	let t2;
    	let t3;
    	let t4_value = formatTime(/*duration*/ ctx[4]) + "";
    	let t4;
    	let t5;
    	let div1;
    	let label0;
    	let t7;
    	let input0;
    	let t8;
    	let div2;
    	let label1;
    	let t10;
    	let input1;
    	let t11;
    	let div4;
    	let t12;
    	let div15;
    	let div5;
    	let h30;
    	let t14;
    	let button1;
    	let t16;
    	let div14;
    	let div7;
    	let div6;
    	let span1;
    	let t18;
    	let span2;
    	let t19;
    	let t20;
    	let t21;
    	let input2;
    	let t22;
    	let div9;
    	let div8;
    	let span3;
    	let t24;
    	let span4;
    	let t25;
    	let t26;
    	let t27;
    	let input3;
    	let t28;
    	let div11;
    	let div10;
    	let span5;
    	let t30;
    	let span6;
    	let t31;
    	let t32;
    	let t33;
    	let input4;
    	let t34;
    	let div13;
    	let div12;
    	let span7;
    	let t36;
    	let span8;
    	let t37_value = /*minSpacing*/ ctx[19].toFixed(2) + "";
    	let t37;
    	let t38;
    	let t39;
    	let input5;
    	let t40;
    	let div17;
    	let div16;
    	let h31;
    	let t42;
    	let button2;
    	let t44;
    	let t45;
    	let div20;
    	let div18;
    	let h32;
    	let t47;
    	let div19;
    	let label2;
    	let input6;
    	let t48;
    	let t49;
    	let t50;
    	let div21;
    	let button3;
    	let t52;
    	let button4;
    	let t53;
    	let button4_class_value;
    	let t54;
    	let div24;
    	let div22;
    	let t55;

    	let t56_value = (/*inPoint*/ ctx[12] !== null
    	? formatTime(/*inPoint*/ ctx[12])
    	: '--:--') + "";

    	let t56;
    	let div22_class_value;
    	let t57;
    	let div23;
    	let t58;

    	let t59_value = (/*outPoint*/ ctx[13] !== null
    	? formatTime(/*outPoint*/ ctx[13])
    	: '--:--') + "";

    	let t59;
    	let div23_class_value;
    	let t60;
    	let div25;
    	let t61;
    	let t62;
    	let exportdialog;
    	let updating_projectName;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = (/*bpm*/ ctx[14] || /*key*/ ctx[15]) && create_if_block_3(ctx);
    	let if_block1 = /*enableSnapping*/ ctx[21] && create_if_block_2(ctx);
    	let if_block2 = /*customRegions*/ ctx[8].length > 0 && create_if_block_1(ctx);
    	let if_block3 = /*sections*/ ctx[7].length > 0 && create_if_block$1(ctx);

    	function exportdialog_projectName_binding(value) {
    		/*exportdialog_projectName_binding*/ ctx[52](value);
    	}

    	let exportdialog_props = {
    		show: /*showExportDialog*/ ctx[9],
    		region: /*selectedRegion*/ ctx[10]
    	};

    	if (/*projectName*/ ctx[0] !== void 0) {
    		exportdialog_props.projectName = /*projectName*/ ctx[0];
    	}

    	exportdialog = new ExportDialog({
    			props: exportdialog_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(exportdialog, 'projectName', exportdialog_projectName_binding));
    	exportdialog.$on("export", /*handleExport*/ ctx[31]);

    	const block = {
    		c: function create() {
    			div26 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = text(" / ");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Volume";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Zoom";
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			div4 = element("div");
    			t12 = space();
    			div15 = element("div");
    			div5 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Transient Detection";
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "DETECT TRANSIENTS";
    			t16 = space();
    			div14 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			span1 = element("span");
    			span1.textContent = "Density";
    			t18 = space();
    			span2 = element("span");
    			t19 = text(/*density*/ ctx[16]);
    			t20 = text("%");
    			t21 = space();
    			input2 = element("input");
    			t22 = space();
    			div9 = element("div");
    			div8 = element("div");
    			span3 = element("span");
    			span3.textContent = "Randomness";
    			t24 = space();
    			span4 = element("span");
    			t25 = text(/*randomness*/ ctx[17]);
    			t26 = text("%");
    			t27 = space();
    			input3 = element("input");
    			t28 = space();
    			div11 = element("div");
    			div10 = element("div");
    			span5 = element("span");
    			span5.textContent = "Sensitivity";
    			t30 = space();
    			span6 = element("span");
    			t31 = text(/*sensitivity*/ ctx[18]);
    			t32 = text("%");
    			t33 = space();
    			input4 = element("input");
    			t34 = space();
    			div13 = element("div");
    			div12 = element("div");
    			span7 = element("span");
    			span7.textContent = "Min Spacing";
    			t36 = space();
    			span8 = element("span");
    			t37 = text(t37_value);
    			t38 = text("s");
    			t39 = space();
    			input5 = element("input");
    			t40 = space();
    			div17 = element("div");
    			div16 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Audio Analysis";
    			t42 = space();
    			button2 = element("button");
    			button2.textContent = "DETECT BPM & KEY";
    			t44 = space();
    			if (if_block0) if_block0.c();
    			t45 = space();
    			div20 = element("div");
    			div18 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Marker Snapping";
    			t47 = space();
    			div19 = element("div");
    			label2 = element("label");
    			input6 = element("input");
    			t48 = text("\r\n        Enable Snapping");
    			t49 = space();
    			if (if_block1) if_block1.c();
    			t50 = space();
    			div21 = element("div");
    			button3 = element("button");
    			button3.textContent = "Add Timestamp";
    			t52 = space();
    			button4 = element("button");
    			t53 = text("Loop Region");
    			t54 = space();
    			div24 = element("div");
    			div22 = element("div");
    			t55 = text("In: ");
    			t56 = text(t56_value);
    			t57 = space();
    			div23 = element("div");
    			t58 = text("Out: ");
    			t59 = text(t59_value);
    			t60 = space();
    			div25 = element("div");
    			if (if_block2) if_block2.c();
    			t61 = space();
    			if (if_block3) if_block3.c();
    			t62 = space();
    			create_component(exportdialog.$$.fragment);
    			attr_dev(button0, "class", "button svelte-14syn3g");
    			add_location(button0, file$2, 491, 6, 10520);
    			attr_dev(span0, "class", "time-display svelte-14syn3g");
    			add_location(span0, file$2, 494, 6, 10635);
    			attr_dev(div0, "class", "control-group svelte-14syn3g");
    			add_location(div0, file$2, 490, 4, 10485);
    			add_location(label0, file$2, 500, 6, 10792);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "class", "svelte-14syn3g");
    			add_location(input0, file$2, 501, 6, 10821);
    			attr_dev(div1, "class", "control-group svelte-14syn3g");
    			add_location(div1, file$2, 499, 4, 10757);
    			add_location(label1, file$2, 511, 6, 11017);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "class", "svelte-14syn3g");
    			add_location(input1, file$2, 512, 6, 11044);
    			attr_dev(div2, "class", "control-group svelte-14syn3g");
    			add_location(div2, file$2, 510, 4, 10982);
    			attr_dev(div3, "class", "controls svelte-14syn3g");
    			add_location(div3, file$2, 489, 2, 10457);
    			attr_dev(div4, "class", "waveform svelte-14syn3g");
    			add_location(div4, file$2, 522, 2, 11209);
    			attr_dev(h30, "class", "analysis-title svelte-14syn3g");
    			add_location(h30, file$2, 526, 6, 11336);
    			attr_dev(button1, "class", "button svelte-14syn3g");
    			add_location(button1, file$2, 527, 6, 11395);
    			attr_dev(div5, "class", "analysis-header svelte-14syn3g");
    			add_location(div5, file$2, 525, 4, 11299);
    			add_location(span1, file$2, 535, 10, 11624);
    			attr_dev(span2, "class", "control-value svelte-14syn3g");
    			add_location(span2, file$2, 536, 10, 11656);
    			attr_dev(div6, "class", "control-label svelte-14syn3g");
    			add_location(div6, file$2, 534, 8, 11585);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "1");
    			attr_dev(input2, "max", "100");
    			attr_dev(input2, "class", "svelte-14syn3g");
    			add_location(input2, file$2, 538, 8, 11727);
    			attr_dev(div7, "class", "control-item svelte-14syn3g");
    			add_location(div7, file$2, 533, 6, 11549);
    			add_location(span3, file$2, 543, 10, 11887);
    			attr_dev(span4, "class", "control-value svelte-14syn3g");
    			add_location(span4, file$2, 544, 10, 11922);
    			attr_dev(div8, "class", "control-label svelte-14syn3g");
    			add_location(div8, file$2, 542, 8, 11848);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "100");
    			attr_dev(input3, "class", "svelte-14syn3g");
    			add_location(input3, file$2, 546, 8, 11996);
    			attr_dev(div9, "class", "control-item svelte-14syn3g");
    			add_location(div9, file$2, 541, 6, 11812);
    			add_location(span5, file$2, 551, 10, 12159);
    			attr_dev(span6, "class", "control-value svelte-14syn3g");
    			add_location(span6, file$2, 552, 10, 12195);
    			attr_dev(div10, "class", "control-label svelte-14syn3g");
    			add_location(div10, file$2, 550, 8, 12120);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "1");
    			attr_dev(input4, "max", "100");
    			attr_dev(input4, "class", "svelte-14syn3g");
    			add_location(input4, file$2, 554, 8, 12270);
    			attr_dev(div11, "class", "control-item svelte-14syn3g");
    			add_location(div11, file$2, 549, 6, 12084);
    			add_location(span7, file$2, 559, 10, 12434);
    			attr_dev(span8, "class", "control-value svelte-14syn3g");
    			add_location(span8, file$2, 560, 10, 12470);
    			attr_dev(div12, "class", "control-label svelte-14syn3g");
    			add_location(div12, file$2, 558, 8, 12395);
    			attr_dev(input5, "type", "range");
    			attr_dev(input5, "min", "0.01");
    			attr_dev(input5, "max", "1");
    			attr_dev(input5, "step", "0.01");
    			attr_dev(input5, "class", "svelte-14syn3g");
    			add_location(input5, file$2, 562, 8, 12555);
    			attr_dev(div13, "class", "control-item svelte-14syn3g");
    			add_location(div13, file$2, 557, 6, 12359);
    			attr_dev(div14, "class", "analysis-controls svelte-14syn3g");
    			add_location(div14, file$2, 532, 4, 11510);
    			attr_dev(div15, "class", "analysis-panel svelte-14syn3g");
    			add_location(div15, file$2, 524, 2, 11265);
    			attr_dev(h31, "class", "analysis-title svelte-14syn3g");
    			add_location(h31, file$2, 569, 6, 12745);
    			attr_dev(button2, "class", "button svelte-14syn3g");
    			add_location(button2, file$2, 570, 6, 12799);
    			attr_dev(div16, "class", "analysis-header svelte-14syn3g");
    			add_location(div16, file$2, 568, 4, 12708);
    			attr_dev(div17, "class", "analysis-panel svelte-14syn3g");
    			add_location(div17, file$2, 567, 2, 12674);
    			attr_dev(h32, "class", "analysis-title svelte-14syn3g");
    			add_location(h32, file$2, 589, 6, 13253);
    			attr_dev(div18, "class", "analysis-header svelte-14syn3g");
    			add_location(div18, file$2, 588, 4, 13216);
    			attr_dev(input6, "type", "checkbox");
    			add_location(input6, file$2, 594, 8, 13396);
    			attr_dev(label2, "class", "radio-label svelte-14syn3g");
    			add_location(label2, file$2, 593, 6, 13359);
    			attr_dev(div19, "class", "snapping-controls svelte-14syn3g");
    			add_location(div19, file$2, 592, 4, 13320);
    			attr_dev(div20, "class", "analysis-panel svelte-14syn3g");
    			add_location(div20, file$2, 587, 2, 13182);
    			attr_dev(button3, "class", "button svelte-14syn3g");
    			add_location(button3, file$2, 643, 4, 14682);
    			attr_dev(button4, "class", button4_class_value = "button " + (/*isLooping*/ ctx[11] ? 'active' : '') + " svelte-14syn3g");
    			add_location(button4, file$2, 646, 4, 14771);
    			attr_dev(div21, "class", "controls svelte-14syn3g");
    			add_location(div21, file$2, 642, 2, 14654);
    			attr_dev(div22, "class", div22_class_value = "marker-point " + (/*inPoint*/ ctx[12] !== null ? 'active' : '') + " svelte-14syn3g");
    			add_location(div22, file$2, 655, 4, 14949);
    			attr_dev(div23, "class", div23_class_value = "marker-point " + (/*outPoint*/ ctx[13] !== null ? 'active' : '') + " svelte-14syn3g");
    			add_location(div23, file$2, 658, 4, 15090);
    			attr_dev(div24, "class", "marker-points svelte-14syn3g");
    			add_location(div24, file$2, 654, 2, 14916);
    			attr_dev(div25, "class", "sections svelte-14syn3g");
    			add_location(div25, file$2, 663, 2, 15245);
    			attr_dev(div26, "class", "timeline-container svelte-14syn3g");
    			add_location(div26, file$2, 488, 0, 10421);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div26, anchor);
    			append_dev(div26, div3);
    			append_dev(div3, div0);
    			append_dev(div0, button0);
    			append_dev(button0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span0);
    			append_dev(span0, t2);
    			append_dev(span0, t3);
    			append_dev(span0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t7);
    			append_dev(div1, input0);
    			set_input_value(input0, /*volume*/ ctx[6]);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t10);
    			append_dev(div2, input1);
    			set_input_value(input1, /*zoom*/ ctx[5]);
    			append_dev(div26, t11);
    			append_dev(div26, div4);
    			/*div4_binding*/ ctx[38](div4);
    			append_dev(div26, t12);
    			append_dev(div26, div15);
    			append_dev(div15, div5);
    			append_dev(div5, h30);
    			append_dev(div5, t14);
    			append_dev(div5, button1);
    			append_dev(div15, t16);
    			append_dev(div15, div14);
    			append_dev(div14, div7);
    			append_dev(div7, div6);
    			append_dev(div6, span1);
    			append_dev(div6, t18);
    			append_dev(div6, span2);
    			append_dev(span2, t19);
    			append_dev(span2, t20);
    			append_dev(div7, t21);
    			append_dev(div7, input2);
    			set_input_value(input2, /*density*/ ctx[16]);
    			append_dev(div14, t22);
    			append_dev(div14, div9);
    			append_dev(div9, div8);
    			append_dev(div8, span3);
    			append_dev(div8, t24);
    			append_dev(div8, span4);
    			append_dev(span4, t25);
    			append_dev(span4, t26);
    			append_dev(div9, t27);
    			append_dev(div9, input3);
    			set_input_value(input3, /*randomness*/ ctx[17]);
    			append_dev(div14, t28);
    			append_dev(div14, div11);
    			append_dev(div11, div10);
    			append_dev(div10, span5);
    			append_dev(div10, t30);
    			append_dev(div10, span6);
    			append_dev(span6, t31);
    			append_dev(span6, t32);
    			append_dev(div11, t33);
    			append_dev(div11, input4);
    			set_input_value(input4, /*sensitivity*/ ctx[18]);
    			append_dev(div14, t34);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, span7);
    			append_dev(div12, t36);
    			append_dev(div12, span8);
    			append_dev(span8, t37);
    			append_dev(span8, t38);
    			append_dev(div13, t39);
    			append_dev(div13, input5);
    			set_input_value(input5, /*minSpacing*/ ctx[19]);
    			append_dev(div26, t40);
    			append_dev(div26, div17);
    			append_dev(div17, div16);
    			append_dev(div16, h31);
    			append_dev(div16, t42);
    			append_dev(div16, button2);
    			append_dev(div17, t44);
    			if (if_block0) if_block0.m(div17, null);
    			append_dev(div26, t45);
    			append_dev(div26, div20);
    			append_dev(div20, div18);
    			append_dev(div18, h32);
    			append_dev(div20, t47);
    			append_dev(div20, div19);
    			append_dev(div19, label2);
    			append_dev(label2, input6);
    			input6.checked = /*enableSnapping*/ ctx[21];
    			append_dev(label2, t48);
    			append_dev(div19, t49);
    			if (if_block1) if_block1.m(div19, null);
    			append_dev(div26, t50);
    			append_dev(div26, div21);
    			append_dev(div21, button3);
    			append_dev(div21, t52);
    			append_dev(div21, button4);
    			append_dev(button4, t53);
    			append_dev(div26, t54);
    			append_dev(div26, div24);
    			append_dev(div24, div22);
    			append_dev(div22, t55);
    			append_dev(div22, t56);
    			append_dev(div24, t57);
    			append_dev(div24, div23);
    			append_dev(div23, t58);
    			append_dev(div23, t59);
    			append_dev(div26, t60);
    			append_dev(div26, div25);
    			if (if_block2) if_block2.m(div25, null);
    			append_dev(div25, t61);
    			if (if_block3) if_block3.m(div25, null);
    			insert_dev(target, t62, anchor);
    			mount_component(exportdialog, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*togglePlayPause*/ ctx[26], false, false, false, false),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[36]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[36]),
    					listen_dev(input0, "input", /*updateVolume*/ ctx[28], false, false, false, false),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[37]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[37]),
    					listen_dev(input1, "input", /*updateZoom*/ ctx[29], false, false, false, false),
    					listen_dev(button1, "click", /*detectTransients*/ ctx[23], false, false, false, false),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[39]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[39]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[40]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[40]),
    					listen_dev(input4, "change", /*input4_change_input_handler*/ ctx[41]),
    					listen_dev(input4, "input", /*input4_change_input_handler*/ ctx[41]),
    					listen_dev(input5, "change", /*input5_change_input_handler*/ ctx[42]),
    					listen_dev(input5, "input", /*input5_change_input_handler*/ ctx[42]),
    					listen_dev(button2, "click", /*analyzeAudio*/ ctx[24], false, false, false, false),
    					listen_dev(input6, "change", /*input6_change_handler*/ ctx[43]),
    					listen_dev(button3, "click", /*addTimestamp*/ ctx[25], false, false, false, false),
    					listen_dev(button4, "click", /*toggleLoop*/ ctx[27], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*isPlaying*/ 4) && t0_value !== (t0_value = (/*isPlaying*/ ctx[2] ? 'Pause' : 'Play') + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty[0] & /*currentTime*/ 8) && t2_value !== (t2_value = formatTime(/*currentTime*/ ctx[3]) + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty[0] & /*duration*/ 16) && t4_value !== (t4_value = formatTime(/*duration*/ ctx[4]) + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*volume*/ 64) {
    				set_input_value(input0, /*volume*/ ctx[6]);
    			}

    			if (dirty[0] & /*zoom*/ 32) {
    				set_input_value(input1, /*zoom*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*density*/ 65536) set_data_dev(t19, /*density*/ ctx[16]);

    			if (dirty[0] & /*density*/ 65536) {
    				set_input_value(input2, /*density*/ ctx[16]);
    			}

    			if (!current || dirty[0] & /*randomness*/ 131072) set_data_dev(t25, /*randomness*/ ctx[17]);

    			if (dirty[0] & /*randomness*/ 131072) {
    				set_input_value(input3, /*randomness*/ ctx[17]);
    			}

    			if (!current || dirty[0] & /*sensitivity*/ 262144) set_data_dev(t31, /*sensitivity*/ ctx[18]);

    			if (dirty[0] & /*sensitivity*/ 262144) {
    				set_input_value(input4, /*sensitivity*/ ctx[18]);
    			}

    			if ((!current || dirty[0] & /*minSpacing*/ 524288) && t37_value !== (t37_value = /*minSpacing*/ ctx[19].toFixed(2) + "")) set_data_dev(t37, t37_value);

    			if (dirty[0] & /*minSpacing*/ 524288) {
    				set_input_value(input5, /*minSpacing*/ ctx[19]);
    			}

    			if (/*bpm*/ ctx[14] || /*key*/ ctx[15]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div17, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*enableSnapping*/ 2097152) {
    				input6.checked = /*enableSnapping*/ ctx[21];
    			}

    			if (/*enableSnapping*/ ctx[21]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div19, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty[0] & /*isLooping*/ 2048 && button4_class_value !== (button4_class_value = "button " + (/*isLooping*/ ctx[11] ? 'active' : '') + " svelte-14syn3g")) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if ((!current || dirty[0] & /*inPoint*/ 4096) && t56_value !== (t56_value = (/*inPoint*/ ctx[12] !== null
    			? formatTime(/*inPoint*/ ctx[12])
    			: '--:--') + "")) set_data_dev(t56, t56_value);

    			if (!current || dirty[0] & /*inPoint*/ 4096 && div22_class_value !== (div22_class_value = "marker-point " + (/*inPoint*/ ctx[12] !== null ? 'active' : '') + " svelte-14syn3g")) {
    				attr_dev(div22, "class", div22_class_value);
    			}

    			if ((!current || dirty[0] & /*outPoint*/ 8192) && t59_value !== (t59_value = (/*outPoint*/ ctx[13] !== null
    			? formatTime(/*outPoint*/ ctx[13])
    			: '--:--') + "")) set_data_dev(t59, t59_value);

    			if (!current || dirty[0] & /*outPoint*/ 8192 && div23_class_value !== (div23_class_value = "marker-point " + (/*outPoint*/ ctx[13] !== null ? 'active' : '') + " svelte-14syn3g")) {
    				attr_dev(div23, "class", div23_class_value);
    			}

    			if (/*customRegions*/ ctx[8].length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div25, t61);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*sections*/ ctx[7].length > 0) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$1(ctx);
    					if_block3.c();
    					if_block3.m(div25, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			const exportdialog_changes = {};
    			if (dirty[0] & /*showExportDialog*/ 512) exportdialog_changes.show = /*showExportDialog*/ ctx[9];
    			if (dirty[0] & /*selectedRegion*/ 1024) exportdialog_changes.region = /*selectedRegion*/ ctx[10];

    			if (!updating_projectName && dirty[0] & /*projectName*/ 1) {
    				updating_projectName = true;
    				exportdialog_changes.projectName = /*projectName*/ ctx[0];
    				add_flush_callback(() => updating_projectName = false);
    			}

    			exportdialog.$set(exportdialog_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(exportdialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(exportdialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div26);
    			/*div4_binding*/ ctx[38](null);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching) detach_dev(t62);
    			destroy_component(exportdialog, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function formatTime(seconds) {
    	const mins = Math.floor(seconds / 60);
    	const secs = Math.floor(seconds % 60);
    	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AudioTimeline', slots, []);
    	let { audioUrl = null } = $$props;
    	let { projectName = 'Untitled Project' } = $$props;
    	let wavesurfer;
    	let container;
    	let isPlaying = false;
    	let currentTime = 0;
    	let duration = 0;
    	let zoom = 50;
    	let volume = 75;
    	let transients = [];
    	let sections = [];
    	let customRegions = [];
    	let showExportDialog = false;
    	let selectedRegion = null;
    	let isLooping = false;
    	let inPoint = null;
    	let outPoint = null;
    	let bpm = null;
    	let key = null;

    	// Analysis settings
    	let density = 91;

    	let randomness = 41;
    	let sensitivity = 70;
    	let minSpacing = 0.05;
    	let snapThreshold = 0.55;
    	let enableSnapping = true;
    	let snapToTransients = true;
    	let snapToBeats = false;

    	// Create analyzers
    	const transientDetector = new TransientDetector({
    			density,
    			randomness,
    			sensitivity,
    			minSpacing
    		});

    	const structureAnalyzer = new SongStructureAnalyzer();
    	const bpmDetector = new BPMDetector();
    	const keyDetector = new KeyDetector();

    	onMount(() => {
    		// Initialize WaveSurfer
    		$$invalidate(35, wavesurfer = u.create({
    			container,
    			waveColor: '#4a9eff',
    			progressColor: '#1453e3',
    			cursorColor: '#fff',
    			height: 128,
    			normalize: true,
    			plugins: [o.create()]
    		}));

    		// Event listeners
    		wavesurfer.on('ready', () => {
    			$$invalidate(4, duration = wavesurfer.getDuration());
    			wavesurfer.setVolume(volume / 100);
    			wavesurfer.zoom(zoom);
    		});

    		wavesurfer.on('play', () => $$invalidate(2, isPlaying = true));
    		wavesurfer.on('pause', () => $$invalidate(2, isPlaying = false));

    		wavesurfer.on('timeupdate', time => {
    			$$invalidate(3, currentTime = time);

    			if (isLooping && selectedRegion) {
    				if (currentTime >= selectedRegion.end) {
    					wavesurfer.setTime(selectedRegion.start);
    				}
    			}
    		});

    		// Load audio if URL is provided
    		if (audioUrl) {
    			wavesurfer.load(audioUrl);
    		}
    	});

    	onDestroy(() => {
    		if (wavesurfer) {
    			wavesurfer.destroy();
    		}
    	});

    	async function detectTransients() {
    		const audioBuffer = wavesurfer.backend.buffer;
    		if (!audioBuffer) return;
    		transients = transientDetector.detectTransients(audioBuffer);
    	}

    	async function analyzeAudio() {
    		const audioBuffer = wavesurfer.backend.buffer;
    		if (!audioBuffer) return;

    		// Detect BPM
    		const bpmResult = bpmDetector.detectBPM(audioBuffer);

    		$$invalidate(14, bpm = Math.round(bpmResult.bpm));

    		// Detect key
    		const keyResult = keyDetector.detectKey(audioBuffer);

    		$$invalidate(15, key = `${keyResult.key} ${keyResult.mode}`);

    		// Analyze structure
    		const analysis = await structureAnalyzer.analyzeStructure(audioBuffer);

    		$$invalidate(7, sections = analysis.sections);
    	}

    	function findNearestTransient(time) {
    		if (!enableSnapping) return time;

    		if (snapToTransients && transients.length) {
    			const nearest = transients.reduce((prev, curr) => {
    				return Math.abs(curr - time) < Math.abs(prev - time)
    				? curr
    				: prev;
    			});

    			if (Math.abs(nearest - time) <= snapThreshold) {
    				return nearest;
    			}
    		}

    		return time;
    	}

    	function addTimestamp() {
    		const time = findNearestTransient(currentTime);

    		if (!inPoint) {
    			$$invalidate(12, inPoint = time);
    		} else if (!outPoint) {
    			$$invalidate(13, outPoint = time);
    			createCustomRegion();
    		}
    	}

    	function createCustomRegion() {
    		if (!inPoint || !outPoint) return;
    		const start = Math.min(inPoint, outPoint);
    		const end = Math.max(inPoint, outPoint);

    		const region = {
    			id: `custom-${Date.now()}`,
    			start,
    			end,
    			color: 'rgba(0, 184, 169, 0.2)',
    			name: `Custom (${formatTime(start)} - ${formatTime(end)})`
    		};

    		$$invalidate(8, customRegions = [...customRegions, region]);

    		// Create WaveSurfer region
    		wavesurfer.addRegion({ ...region, drag: false, resize: false });

    		// Reset points
    		$$invalidate(12, inPoint = null);

    		$$invalidate(13, outPoint = null);
    	}

    	function togglePlayPause() {
    		if (wavesurfer) {
    			wavesurfer.playPause();
    		}
    	}

    	function toggleLoop() {
    		$$invalidate(11, isLooping = !isLooping);
    	}

    	function updateVolume(event) {
    		const newVolume = event.target.value;

    		if (wavesurfer) {
    			wavesurfer.setVolume(newVolume / 100);
    		}

    		$$invalidate(6, volume = newVolume);
    	}

    	function updateZoom(event) {
    		const newZoom = event.target.value;

    		if (wavesurfer) {
    			wavesurfer.zoom(newZoom);
    		}

    		$$invalidate(5, zoom = newZoom);
    	}

    	function exportRegion(region) {
    		$$invalidate(10, selectedRegion = region);
    		$$invalidate(9, showExportDialog = true);
    	}

    	function handleExport(event) {
    		$$invalidate(9, showExportDialog = false);
    	}

    	function seekToRegion(region) {
    		if (wavesurfer) {
    			wavesurfer.setTime(region.start);

    			if (!isPlaying) {
    				wavesurfer.play();
    			}
    		}
    	}

    	function playRegion(region) {
    		if (wavesurfer) {
    			$$invalidate(10, selectedRegion = region);
    			wavesurfer.setTime(region.start);
    			wavesurfer.play();
    		}
    	}

    	const writable_props = ['audioUrl', 'projectName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AudioTimeline> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_change_input_handler() {
    		volume = to_number(this.value);
    		$$invalidate(6, volume);
    	}

    	function input1_change_input_handler() {
    		zoom = to_number(this.value);
    		$$invalidate(5, zoom);
    	}

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(1, container);
    		});
    	}

    	function input2_change_input_handler() {
    		density = to_number(this.value);
    		$$invalidate(16, density);
    	}

    	function input3_change_input_handler() {
    		randomness = to_number(this.value);
    		$$invalidate(17, randomness);
    	}

    	function input4_change_input_handler() {
    		sensitivity = to_number(this.value);
    		$$invalidate(18, sensitivity);
    	}

    	function input5_change_input_handler() {
    		minSpacing = to_number(this.value);
    		$$invalidate(19, minSpacing);
    	}

    	function input6_change_handler() {
    		enableSnapping = this.checked;
    		$$invalidate(21, enableSnapping);
    	}

    	function input0_change_handler() {
    		snapToTransients = this.__value;
    		$$invalidate(22, snapToTransients);
    	}

    	function input1_change_handler() {
    		snapToTransients = this.__value;
    		$$invalidate(22, snapToTransients);
    	}

    	function input2_change_input_handler_1() {
    		snapThreshold = to_number(this.value);
    		$$invalidate(20, snapThreshold);
    	}

    	const click_handler = region => playRegion(region);
    	const click_handler_1 = region => exportRegion(region);
    	const click_handler_2 = region => seekToRegion(region);
    	const click_handler_3 = section => seekToRegion(section);

    	function exportdialog_projectName_binding(value) {
    		projectName = value;
    		$$invalidate(0, projectName);
    	}

    	$$self.$$set = $$props => {
    		if ('audioUrl' in $$props) $$invalidate(34, audioUrl = $$props.audioUrl);
    		if ('projectName' in $$props) $$invalidate(0, projectName = $$props.projectName);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		WaveSurfer: u,
    		RegionsPlugin: o,
    		TransientDetector,
    		SongStructureAnalyzer,
    		BPMDetector,
    		KeyDetector,
    		ExportDialog,
    		AudioVisualizer,
    		audioUrl,
    		projectName,
    		wavesurfer,
    		container,
    		isPlaying,
    		currentTime,
    		duration,
    		zoom,
    		volume,
    		transients,
    		sections,
    		customRegions,
    		showExportDialog,
    		selectedRegion,
    		isLooping,
    		inPoint,
    		outPoint,
    		bpm,
    		key,
    		density,
    		randomness,
    		sensitivity,
    		minSpacing,
    		snapThreshold,
    		enableSnapping,
    		snapToTransients,
    		snapToBeats,
    		transientDetector,
    		structureAnalyzer,
    		bpmDetector,
    		keyDetector,
    		detectTransients,
    		analyzeAudio,
    		findNearestTransient,
    		addTimestamp,
    		createCustomRegion,
    		formatTime,
    		togglePlayPause,
    		toggleLoop,
    		updateVolume,
    		updateZoom,
    		exportRegion,
    		handleExport,
    		seekToRegion,
    		playRegion
    	});

    	$$self.$inject_state = $$props => {
    		if ('audioUrl' in $$props) $$invalidate(34, audioUrl = $$props.audioUrl);
    		if ('projectName' in $$props) $$invalidate(0, projectName = $$props.projectName);
    		if ('wavesurfer' in $$props) $$invalidate(35, wavesurfer = $$props.wavesurfer);
    		if ('container' in $$props) $$invalidate(1, container = $$props.container);
    		if ('isPlaying' in $$props) $$invalidate(2, isPlaying = $$props.isPlaying);
    		if ('currentTime' in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    		if ('duration' in $$props) $$invalidate(4, duration = $$props.duration);
    		if ('zoom' in $$props) $$invalidate(5, zoom = $$props.zoom);
    		if ('volume' in $$props) $$invalidate(6, volume = $$props.volume);
    		if ('transients' in $$props) transients = $$props.transients;
    		if ('sections' in $$props) $$invalidate(7, sections = $$props.sections);
    		if ('customRegions' in $$props) $$invalidate(8, customRegions = $$props.customRegions);
    		if ('showExportDialog' in $$props) $$invalidate(9, showExportDialog = $$props.showExportDialog);
    		if ('selectedRegion' in $$props) $$invalidate(10, selectedRegion = $$props.selectedRegion);
    		if ('isLooping' in $$props) $$invalidate(11, isLooping = $$props.isLooping);
    		if ('inPoint' in $$props) $$invalidate(12, inPoint = $$props.inPoint);
    		if ('outPoint' in $$props) $$invalidate(13, outPoint = $$props.outPoint);
    		if ('bpm' in $$props) $$invalidate(14, bpm = $$props.bpm);
    		if ('key' in $$props) $$invalidate(15, key = $$props.key);
    		if ('density' in $$props) $$invalidate(16, density = $$props.density);
    		if ('randomness' in $$props) $$invalidate(17, randomness = $$props.randomness);
    		if ('sensitivity' in $$props) $$invalidate(18, sensitivity = $$props.sensitivity);
    		if ('minSpacing' in $$props) $$invalidate(19, minSpacing = $$props.minSpacing);
    		if ('snapThreshold' in $$props) $$invalidate(20, snapThreshold = $$props.snapThreshold);
    		if ('enableSnapping' in $$props) $$invalidate(21, enableSnapping = $$props.enableSnapping);
    		if ('snapToTransients' in $$props) $$invalidate(22, snapToTransients = $$props.snapToTransients);
    		if ('snapToBeats' in $$props) snapToBeats = $$props.snapToBeats;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[1] & /*wavesurfer, audioUrl*/ 24) {
    			// Watch for audio URL changes
    			if (wavesurfer && audioUrl) {
    				wavesurfer.load(audioUrl);
    				transients = [];
    				$$invalidate(7, sections = []);
    				$$invalidate(8, customRegions = []);
    				$$invalidate(12, inPoint = null);
    				$$invalidate(13, outPoint = null);
    				$$invalidate(14, bpm = null);
    				$$invalidate(15, key = null);
    			}
    		}
    	};

    	return [
    		projectName,
    		container,
    		isPlaying,
    		currentTime,
    		duration,
    		zoom,
    		volume,
    		sections,
    		customRegions,
    		showExportDialog,
    		selectedRegion,
    		isLooping,
    		inPoint,
    		outPoint,
    		bpm,
    		key,
    		density,
    		randomness,
    		sensitivity,
    		minSpacing,
    		snapThreshold,
    		enableSnapping,
    		snapToTransients,
    		detectTransients,
    		analyzeAudio,
    		addTimestamp,
    		togglePlayPause,
    		toggleLoop,
    		updateVolume,
    		updateZoom,
    		exportRegion,
    		handleExport,
    		seekToRegion,
    		playRegion,
    		audioUrl,
    		wavesurfer,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		div4_binding,
    		input2_change_input_handler,
    		input3_change_input_handler,
    		input4_change_input_handler,
    		input5_change_input_handler,
    		input6_change_handler,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input2_change_input_handler_1,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		exportdialog_projectName_binding
    	];
    }

    class AudioTimeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { audioUrl: 34, projectName: 0 }, null, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AudioTimeline",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get audioUrl() {
    		throw new Error("<AudioTimeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set audioUrl(value) {
    		throw new Error("<AudioTimeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get projectName() {
    		throw new Error("<AudioTimeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set projectName(value) {
    		throw new Error("<AudioTimeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\AudioFileManager.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\AudioFileManager.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (267:2) {:else}
    function create_else_block(ctx) {
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "🎵";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "No audio files uploaded yet";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "Click \"Open Audio File\" to get started";
    			attr_dev(div0, "class", "empty-icon svelte-1xrqjl6");
    			add_location(div0, file$1, 268, 6, 6140);
    			attr_dev(div1, "class", "empty-message svelte-1xrqjl6");
    			add_location(div1, file$1, 269, 6, 6180);
    			attr_dev(div2, "class", "empty-hint svelte-1xrqjl6");
    			add_location(div2, file$1, 270, 6, 6248);
    			attr_dev(div3, "class", "empty-state svelte-1xrqjl6");
    			add_location(div3, file$1, 267, 4, 6107);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(267:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (241:2) {#if audioFiles.length > 0}
    function create_if_block(ctx) {
    	let div;
    	let each_value = /*audioFiles*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "file-list svelte-1xrqjl6");
    			add_location(div, file$1, 241, 4, 5216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedFile, audioFiles, selectFile, removeFile, formatFileSize*/ 27) {
    				each_value = /*audioFiles*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(241:2) {#if audioFiles.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (243:6) {#each audioFiles as file}
    function create_each_block(ctx) {
    	let div3;
    	let span;
    	let t1;
    	let div2;
    	let div0;
    	let t2_value = /*file*/ ctx[10].name + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4_value = formatFileSize(/*file*/ ctx[10].size) + "";
    	let t4;
    	let t5;
    	let button;
    	let t7;
    	let div3_class_value;
    	let div3_aria_selected_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*file*/ ctx[10]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*file*/ ctx[10]);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[8](/*file*/ ctx[10], ...args);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			span = element("span");
    			span.textContent = "•";
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "×";
    			t7 = space();
    			attr_dev(span, "class", "bullet svelte-1xrqjl6");
    			add_location(span, file$1, 251, 10, 5637);
    			attr_dev(div0, "class", "file-name svelte-1xrqjl6");
    			add_location(div0, file$1, 253, 12, 5715);
    			attr_dev(div1, "class", "file-meta svelte-1xrqjl6");
    			add_location(div1, file$1, 254, 12, 5769);
    			attr_dev(div2, "class", "file-info svelte-1xrqjl6");
    			add_location(div2, file$1, 252, 10, 5678);
    			attr_dev(button, "class", "remove-button svelte-1xrqjl6");
    			attr_dev(button, "aria-label", "Remove file");
    			add_location(button, file$1, 256, 10, 5855);

    			attr_dev(div3, "class", div3_class_value = "file-item " + (/*selectedFile*/ ctx[1] && /*selectedFile*/ ctx[1].id === /*file*/ ctx[10].id
    			? 'selected'
    			: '') + " svelte-1xrqjl6");

    			attr_dev(div3, "tabindex", "0");
    			attr_dev(div3, "role", "option");
    			attr_dev(div3, "aria-selected", div3_aria_selected_value = /*selectedFile*/ ctx[1] && /*selectedFile*/ ctx[1].id === /*file*/ ctx[10].id);
    			add_location(div3, file$1, 243, 8, 5283);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, span);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div3, t5);
    			append_dev(div3, button);
    			append_dev(div3, t7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", stop_propagation(click_handler), false, false, true, false),
    					listen_dev(div3, "click", click_handler_1, false, false, false, false),
    					listen_dev(div3, "keydown", keydown_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*audioFiles*/ 1 && t2_value !== (t2_value = /*file*/ ctx[10].name + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*audioFiles*/ 1 && t4_value !== (t4_value = formatFileSize(/*file*/ ctx[10].size) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*selectedFile, audioFiles*/ 3 && div3_class_value !== (div3_class_value = "file-item " + (/*selectedFile*/ ctx[1] && /*selectedFile*/ ctx[1].id === /*file*/ ctx[10].id
    			? 'selected'
    			: '') + " svelte-1xrqjl6")) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty & /*selectedFile, audioFiles*/ 3 && div3_aria_selected_value !== (div3_aria_selected_value = /*selectedFile*/ ctx[1] && /*selectedFile*/ ctx[1].id === /*file*/ ctx[10].id)) {
    				attr_dev(div3, "aria-selected", div3_aria_selected_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(243:6) {#each audioFiles as file}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let input;
    	let t2;
    	let label;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*audioFiles*/ ctx[0].length > 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Audio Files";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			label = element("label");
    			label.textContent = "Open Audio File";
    			t4 = space();
    			if_block.c();
    			attr_dev(h3, "class", "svelte-1xrqjl6");
    			add_location(h3, file$1, 227, 2, 4923);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "audio-upload");
    			attr_dev(input, "class", "file-input svelte-1xrqjl6");
    			attr_dev(input, "accept", "audio/*");
    			input.multiple = true;
    			add_location(input, file$1, 228, 2, 4947);
    			attr_dev(label, "for", "audio-upload");
    			attr_dev(label, "class", "file-label svelte-1xrqjl6");
    			add_location(label, file$1, 236, 2, 5097);
    			attr_dev(div, "class", "audio-file-manager svelte-1xrqjl6");
    			add_location(div, file$1, 226, 0, 4887);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(div, t2);
    			append_dev(div, label);
    			append_dev(div, t4);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*handleFileUpload*/ ctx[2], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function formatFileSize(bytes) {
    	if (bytes < 1024) return `${bytes} B`;
    	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    	return `${(bytes / 1048576).toFixed(1)} MB`;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AudioFileManager', slots, []);
    	let { maxFiles = 5 } = $$props;

    	// Local state
    	let audioFiles = [];

    	let selectedFile = null;
    	const dispatch = createEventDispatcher();

    	// Methods
    	function handleFileUpload(event) {
    		const files = Array.from(event.target.files);
    		if (files.length === 0) return;

    		// Create URL objects for each file
    		const newFiles = files.map(file => ({
    			id: `file-${Math.random().toString(36).substring(2, 9)}`,
    			name: file.name,
    			type: file.type,
    			size: file.size,
    			url: URL.createObjectURL(file),
    			file
    		}));

    		// Add new files to the list (up to maxFiles)
    		$$invalidate(0, audioFiles = [...audioFiles, ...newFiles].slice(0, maxFiles));

    		// Select the first new file
    		if (!selectedFile && audioFiles.length > 0) {
    			selectFile(audioFiles[0]);
    		}

    		// Reset the input
    		event.target.value = '';
    	}

    	function selectFile(file) {
    		$$invalidate(1, selectedFile = file);
    		dispatch('select', file);
    	}

    	function removeFile(id) {
    		// Revoke object URL to prevent memory leaks
    		const fileToRemove = audioFiles.find(file => file.id === id);

    		if (fileToRemove) {
    			URL.revokeObjectURL(fileToRemove.url);
    		}

    		// Remove file from list
    		$$invalidate(0, audioFiles = audioFiles.filter(file => file.id !== id));

    		// If the selected file was removed, select another one if available
    		if (selectedFile && selectedFile.id === id) {
    			$$invalidate(1, selectedFile = audioFiles.length > 0 ? audioFiles[0] : null);
    			dispatch('select', selectedFile);
    		}
    	}

    	const writable_props = ['maxFiles'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AudioFileManager> was created with unknown prop '${key}'`);
    	});

    	const click_handler = file => removeFile(file);
    	const click_handler_1 = file => selectFile(file);
    	const keydown_handler = (file, e) => e.key === 'Enter' && selectFile(file);

    	$$self.$$set = $$props => {
    		if ('maxFiles' in $$props) $$invalidate(5, maxFiles = $$props.maxFiles);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		maxFiles,
    		audioFiles,
    		selectedFile,
    		dispatch,
    		handleFileUpload,
    		selectFile,
    		removeFile,
    		formatFileSize
    	});

    	$$self.$inject_state = $$props => {
    		if ('maxFiles' in $$props) $$invalidate(5, maxFiles = $$props.maxFiles);
    		if ('audioFiles' in $$props) $$invalidate(0, audioFiles = $$props.audioFiles);
    		if ('selectedFile' in $$props) $$invalidate(1, selectedFile = $$props.selectedFile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		audioFiles,
    		selectedFile,
    		handleFileUpload,
    		selectFile,
    		removeFile,
    		maxFiles,
    		click_handler,
    		click_handler_1,
    		keydown_handler
    	];
    }

    class AudioFileManager extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { maxFiles: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AudioFileManager",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get maxFiles() {
    		throw new Error("<AudioFileManager>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxFiles(value) {
    		throw new Error("<AudioFileManager>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div5;
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let span;
    	let t2;
    	let t3;
    	let div4;
    	let div2;
    	let audiofilemanager;
    	let t4;
    	let div3;
    	let audiotimeline;
    	let updating_projectName;
    	let current;
    	audiofilemanager = new AudioFileManager({ $$inline: true });
    	audiofilemanager.$on("select", /*handleFileSelect*/ ctx[2]);

    	function audiotimeline_projectName_binding(value) {
    		/*audiotimeline_projectName_binding*/ ctx[3](value);
    	}

    	let audiotimeline_props = { audioUrl: /*selectedAudioUrl*/ ctx[0] };

    	if (/*projectName*/ ctx[1] !== void 0) {
    		audiotimeline_props.projectName = /*projectName*/ ctx[1];
    	}

    	audiotimeline = new AudioTimeline({
    			props: audiotimeline_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(audiotimeline, 'projectName', audiotimeline_projectName_binding));

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Audio Editor";
    			t1 = space();
    			div0 = element("div");
    			span = element("span");
    			t2 = text(/*projectName*/ ctx[1]);
    			t3 = space();
    			div4 = element("div");
    			div2 = element("div");
    			create_component(audiofilemanager.$$.fragment);
    			t4 = space();
    			div3 = element("div");
    			create_component(audiotimeline.$$.fragment);
    			attr_dev(h1, "class", "app-title svelte-hbsv4x");
    			add_location(h1, file, 112, 4, 2328);
    			attr_dev(span, "class", "project-title svelte-hbsv4x");
    			add_location(span, file, 114, 6, 2407);
    			attr_dev(div0, "class", "project-info");
    			add_location(div0, file, 113, 4, 2373);
    			attr_dev(div1, "class", "app-header svelte-hbsv4x");
    			add_location(div1, file, 111, 2, 2298);
    			attr_dev(div2, "class", "sidebar");
    			add_location(div2, file, 119, 4, 2515);
    			attr_dev(div3, "class", "main-content svelte-hbsv4x");
    			add_location(div3, file, 123, 4, 2617);
    			attr_dev(div4, "class", "two-column svelte-hbsv4x");
    			add_location(div4, file, 118, 2, 2485);
    			attr_dev(div5, "class", "container svelte-hbsv4x");
    			add_location(div5, file, 110, 0, 2271);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			mount_component(audiofilemanager, div2, null);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			mount_component(audiotimeline, div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*projectName*/ 2) set_data_dev(t2, /*projectName*/ ctx[1]);
    			const audiotimeline_changes = {};
    			if (dirty & /*selectedAudioUrl*/ 1) audiotimeline_changes.audioUrl = /*selectedAudioUrl*/ ctx[0];

    			if (!updating_projectName && dirty & /*projectName*/ 2) {
    				updating_projectName = true;
    				audiotimeline_changes.projectName = /*projectName*/ ctx[1];
    				add_flush_callback(() => updating_projectName = false);
    			}

    			audiotimeline.$set(audiotimeline_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(audiofilemanager.$$.fragment, local);
    			transition_in(audiotimeline.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(audiofilemanager.$$.fragment, local);
    			transition_out(audiotimeline.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(audiofilemanager);
    			destroy_component(audiotimeline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let selectedAudioUrl = null;
    	let projectName = 'Untitled Project';

    	function handleFileSelect(event) {
    		$$invalidate(0, selectedAudioUrl = event.detail.url);
    	}

    	onMount(() => {
    		
    	}); // Initialize any needed functionality here

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function audiotimeline_projectName_binding(value) {
    		projectName = value;
    		$$invalidate(1, projectName);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		AudioTimeline,
    		AudioFileManager,
    		selectedAudioUrl,
    		projectName,
    		handleFileSelect
    	});

    	$$self.$inject_state = $$props => {
    		if ('selectedAudioUrl' in $$props) $$invalidate(0, selectedAudioUrl = $$props.selectedAudioUrl);
    		if ('projectName' in $$props) $$invalidate(1, projectName = $$props.projectName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedAudioUrl,
    		projectName,
    		handleFileSelect,
    		audiotimeline_projectName_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
