from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ModeloDeMuestra(BaseModel):
    jugadaRival: dict
    contexto: dict
    tablero: list
    potestades: list

@app.post("/AnalisisIncial/")
def hacerAnalisis(muestra: ModeloDeMuestra):
    return {
        "mensaje": f"a la primera bro"
        "datos": muestra
    }