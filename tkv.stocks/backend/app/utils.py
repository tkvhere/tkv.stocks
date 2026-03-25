import joblib
import os

def save_model_local(model, path='models'):
    os.makedirs(path, exist_ok=True)
    fname = os.path.join(path, 'model.pkl')
    joblib.dump(model, fname)
    return fname
