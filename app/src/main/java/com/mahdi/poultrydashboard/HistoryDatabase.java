package com.mahdi.poultrydashboard;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

final class HistoryDatabase extends SQLiteOpenHelper {
    private static final long FIVE_MINUTES = 5L * 60L * 1000L;
    private static final long TWELVE_HOURS = 12L * 60L * 60L * 1000L;

    HistoryDatabase(Context context) {
        super(context, "elmajd_history.db", null, 1);
    }

    @Override
    public void onCreate(SQLiteDatabase database) {
        database.execSQL("CREATE TABLE samples (bucket_ms INTEGER PRIMARY KEY, temp REAL NOT NULL, I2 INTEGER NOT NULL, I3 INTEGER NOT NULL, I4 INTEGER NOT NULL, I5 INTEGER NOT NULL, I6 INTEGER NOT NULL)");
        database.execSQL("CREATE INDEX samples_time ON samples(bucket_ms)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase database, int oldVersion, int newVersion) {
        // Version 1 has no migration path yet.
    }

    synchronized void record(JSONObject payload, long now) throws Exception {
        JSONObject analog = payload.getJSONObject("i1");
        JSONObject inputs = payload.getJSONObject("inputs");
        ContentValues values = new ContentValues();
        values.put("bucket_ms", (now / FIVE_MINUTES) * FIVE_MINUTES);
        values.put("temp", analog.getDouble("temp_c"));
        for (String key : new String[]{"I2", "I3", "I4", "I5", "I6"}) {
            int bit = inputs.getInt(key);
            if (bit != 0 && bit != 1) throw new IllegalArgumentException("Invalid " + key);
            values.put(key, bit);
        }
        SQLiteDatabase database = getWritableDatabase();
        database.insertWithOnConflict("samples", null, values, SQLiteDatabase.CONFLICT_REPLACE);
        database.delete("samples", "bucket_ms < ?", new String[]{String.valueOf(now - TWELVE_HOURS)});
    }

    synchronized String readLastTwelveHours(long now) {
        JSONArray rows = new JSONArray();
        try (Cursor cursor = getReadableDatabase().query(
            "samples",
            new String[]{"bucket_ms", "temp", "I2", "I3", "I4", "I5", "I6"},
            "bucket_ms >= ?",
            new String[]{String.valueOf(now - TWELVE_HOURS)},
            null,
            null,
            "bucket_ms ASC"
        )) {
            while (cursor.moveToNext()) {
                JSONObject row = new JSONObject();
                row.put("t", cursor.getLong(0));
                row.put("temp", cursor.getDouble(1));
                row.put("I2", cursor.getInt(2));
                row.put("I3", cursor.getInt(3));
                row.put("I4", cursor.getInt(4));
                row.put("I5", cursor.getInt(5));
                row.put("I6", cursor.getInt(6));
                rows.put(row);
            }
        } catch (Exception ignored) {
            return "[]";
        }
        return rows.toString();
    }
}
