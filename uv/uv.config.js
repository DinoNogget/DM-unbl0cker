(function () {
    // Default proxy (bare) server. Can be overridden in Settings -> "Proxy server",
    // which is stored in localStorage and handed to the service worker via ?bare=
    var DEFAULT_BARE = 'https://collegeapp.me/v/';
    var bare = null;

    try {
        if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
            bare = new URL(self.location.href).searchParams.get('bare');
        }
    } catch (e) {}

    try {
        if (!bare && self.localStorage) bare = self.localStorage.getItem('bareServer');
    } catch (e) {}

    if (bare && !/\/$/.test(bare)) bare += '/';

    self.__uv$config = {
        prefix: '/service/',
        bare: bare || DEFAULT_BARE,
        defaultBare: DEFAULT_BARE,
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode,
        handler: '/uv/uv.handler.js',
        bundle: '/uv/uv.bundle.js',
        config: '/uv/uv.config.js',
        sw: '/uv/uv.sw.js',
    };
})();
