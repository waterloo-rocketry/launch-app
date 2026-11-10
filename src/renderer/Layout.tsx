/*
create GridItem to store the type of widget at the specified index
Create a list to save them so they can be saved/exported
*/

// when there is more widget they should be added into widgetconfig type
export type widgetConfig = 
    { kind: 'progress-bar', signalId: string, min: number, max: number}
    | {kind: 'channel-list', problemOnly: boolean, hidden?: string[]}

export interface gridItem {
    id: string
    x: number;
    y: number;
    w: number;
    h: number;
    widgetConfig: widgetConfig
}

export interface dashboardLayout {
    version: number;
    numberOfCol: number;
    items: gridItem[]
}

const DEFAULT_LAYOUT: dashboardLayout = {
    version: 1,
    numberOfCol: 2,
    items: [
        {id: 'temperature-progress-bar', x: 0, y: 0, w: 1, h: 1, widgetConfig: {
            kind: 'progress-bar',
            signalId: 'temp', 
            min: -20, 
            max: -20
        }},
        {id: 'all-channel-list', x: 0, y: 0, w: 1, h: 1, widgetConfig: {
            kind: 'channel-list',
            problemOnly: false
        }}
    ]
}