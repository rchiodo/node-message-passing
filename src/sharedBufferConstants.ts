export const enum HeaderIndex {
    messageOffset = 0,
    messageByteLength = 1,
    binaryParamOffset = 2,
    binaryParamByteLength = 3,
    errno = 4,
    resultKind = 5,
    resultOffset = 6,
    resultByteLength = 7,
}

export const enum HeaderSize {
    request = 8,
    binary = 8,
    result = 16,
    total = HeaderSize.request + HeaderSize.binary + HeaderSize.result,
}

export const enum SyncSize {
    total = 4,
}

export const enum MaxSharedBufferSize {
    // 10MB
    total = 10 * 1024 * 1024,
}
