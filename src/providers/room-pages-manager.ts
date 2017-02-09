import { RoomPage, RoomLive, UserPreview } from './config';
import { UserService } from './user-service';


export class RoomPool {
    rooms: Array<RoomLive> = [];
    _room_in_uses: Array<RoomLive> = [];
    constructor() {

    }
    create() {
        while (this.rooms.length < 20) this.rooms.push(new RoomLive());
    }

    obtain(): RoomLive {
        if (this.rooms.length == 0) {
            while (this.rooms.length < 20) this.rooms.push(new RoomLive());
        }
        let room = this.rooms.pop();
        this._room_in_uses.push(room);
        return room;
    }

    findRoomById(id: string): RoomLive {
        for (let room of this._room_in_uses) {
            if (room.room_id == id) return room;
        }
        return null;
    }

    findRoomByTalentName(talent_name: string): RoomLive {
        for (let room of this._room_in_uses) {
            if (room.talent.name == talent_name) return room;
        }
        return null;
    }
    findRoomByTalent(talent: UserPreview): RoomLive {
        return this.findRoomByTalentName(talent.username);
    }
}

export class RoomManager {
    /*danh sách phân loại phòng*/
    mPages: Array<RoomPage> = [];
    /*danh sách phòng đang trực tuyến*/
    mRooms: Array<RoomLive> = [];

    mSelectedCategory: number = -1;

    mRoomPool: RoomPool = new RoomPool();
    constructor() {
        this.mRoomPool.create();
    }
    findTalentRoom(talent_name: string) {
        return this.mRoomPool.findRoomByTalentName(talent_name);
    }
    onResponseRoomPageCategories(data, forceClearData) {
        if (data.status != 1) return;
        if (forceClearData) this.mPages = [];
        for (let page of data.content) {
            let p = this.getRoomPageByID(page.id);
            if (p == undefined) {
                let roomPage = new RoomPage();
                roomPage.id = page.id;
                roomPage.name = page.title;
                this.mPages.push(roomPage);
            } else {
                p.name = page.title;
            }
        }
    }

    hasRoomCategory() {
        return this.mPages.length > 0 && this.mPages[0].rooms.length > 0;
    }
    onResponseRoomsLiveStream(userService: UserService, data, forceClearData) {
        if (data.status != 1) return;
        if (forceClearData) this.mRooms = [];
        for (let room of data.content) {
            let r = this.getHotLiveRoomByID(room.roomId);
            if (r == undefined) {
                let roomlive = this.mRoomPool.obtain();
                roomlive.onResponseHotRoomLive(room);
                this.mRooms.push(roomlive);
            } else {
                r.onResponseHotRoomLive(room);
            }
        }
    }

    onResponseHotLiveStream(data, forceClearData) {
        if (data.status != 1) return;
        if (forceClearData) this.mRooms = [];
        for (let room of data.content) {
            let r = this.getHotLiveRoomByID(room.roomId);
            if (r == undefined) {
                let roomlive = this.mRoomPool.obtain();
                roomlive.onResponseHotRoomLive(room);
                this.mRooms.push(roomlive);
            } else {
                r.onResponseHotRoomLive(room);
            }
        }
    }
    setSelectedCategory(id) {
        this.mSelectedCategory = id;
    }
    getNeighborStream(room: RoomLive) {
        if (this.mSelectedCategory == -1) {
            if (this.mRooms.length < 2) return undefined;
            for (let i = 0; i < this.mRooms.length; i++) {
                if (room.room_id == this.mRooms[i].room_id) {
                    let nextId = (i + 1) >= this.mRooms.length ? 0 : (i + 1);
                    let previousid = (i - 1) < 0 ? (this.mRooms.length - 1) : (i - 1);
                    return {
                        previous: this.mRooms[previousid],
                        next: this.mRooms[nextId]
                    };
                }
            }
        } else {
            let roomPage = this.getSelectedCategory();
            if (roomPage != undefined) {
                if (roomPage.rooms.length < 2) return undefined;
                for (let i = 0; i < roomPage.rooms.length; i++) {
                    if (room.room_id == roomPage.rooms[i].room_id) {
                        let nextId = (i + 1) >= roomPage.rooms.length ? 0 : (i + 1);
                        let previousid = (i - 1) < 0 ? (roomPage.rooms.length - 1) : (i - 1);
                        return {
                            previous: roomPage.rooms[previousid],
                            next: roomPage.rooms[nextId]
                        };
                    }
                }
            }
        }
        return undefined;
    }

    getSelectedCategory(): RoomPage {
        for (let roomPage of this.mPages) {
            if (roomPage.id == this.mSelectedCategory) {
                return roomPage;
            }
        }
        return undefined;

    }

    // getNeighborStream(room: RoomLive) {
    //     if (this.mRooms.length < 2) return undefined;
    //     for (let i = 0; i < this.mRooms.length; i++) {
    //         if (room.room_id == this.mRooms[i].room_id) {
    //             let nextId = (i + 1) >= this.mRooms.length ? 0 : (i + 1);
    //             let previousid = (i - 1) < 0 ? (this.mRooms.length - 1) : (i - 1);
    //             return {
    //                 previous: this.mRooms[previousid],
    //                 next: this.mRooms[nextId]
    //             };
    //         }
    //     }
    //     return undefined;
    // }
    onResponsePageLiveStream(category, data, forceClearData) {
        if (data.status != 1) return;
        let page = this.getRoomPageByID(category);
        if (page == undefined) return;
        if (forceClearData) page.rooms = [];

        for (let room of data.content) {
            let r = this.getRoomByID(page, room.roomId);
            if (r == undefined) {
                let roomlive = new RoomLive();
                roomlive.onResponseRoomLive(room);
                page.rooms.push(roomlive);
            } else {
                r.onResponseHotRoomLive(room);
            }
        }
    }

    getRoomPageByID(id: number) {
        for (let roomPage of this.mPages) {
            if (roomPage.id == id) return roomPage;
        }
        return undefined;
    }

    getRoomByID(page: RoomPage, id): RoomLive {
        if (page == undefined) return undefined;
        for (let room of page.rooms) {
            if (room.room_id == id) return room;
        }
        return undefined;
    }
    getHotLiveRoomByID(id): RoomLive {
        for (let room of this.mRooms) {
            if (room.room_id == id) return room;
        }
        return undefined;
    }


}