from flask import Flask, request, render_template, redirect, url_for, jsonify
import sys
import io


app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        code = request.form.get('code')
        # Capture the output of exec
        old_stdout = sys.stdout
        redirected_output = sys.stdout = io.StringIO()
        try:
            exec(code)
        except Exception as e:
            return render_template('index.html', output=f'Error: {e}')
        finally:
            sys.stdout = old_stdout
        output = redirected_output.getvalue()
        return render_template('index.html', output=output)
    return render_template('index.html', output='')

if __name__ == '__main__':
    app.run(debug=True)
